import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { getUpstreamStream } from "@/lib/kamui/client";
import { externalUrlForProxy, isAllowedImageHost, upstreamPathForProxy } from "@/lib/kamui/images";

/**
 * Image proxy — GET /api/img/<file> and /api/img/video/<file>.
 *
 * Two jobs:
 *  1. Make the catalog's images actually load. Upstream stores RELATIVE paths
 *     ("/api/uploads/foo.jpg") and hands them to consumers verbatim, so pasting
 *     them into our HTML yields a 404 on our own origin.
 *  2. Keep the backend's hostname out of the page. Every <img src> in this store
 *     points at this store.
 *
 * It is NOT a general proxy: `upstreamPathForProxy` allow-lists the two path
 * shapes upstream serves and rejects anything else, so this cannot be pointed at
 * an arbitrary URL.
 */

export const runtime = "nodejs";
// The bytes are immutable per filename; we set our own long cache headers below.
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=31536000, immutable";
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp|gif|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/;

/** A hostile image is still a bandwidth bill; stop reading past this. */
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const EXT_TIMEOUT_MS = 12_000;

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Is this literal address inside a range we must never reach on a visitor's
 * behalf? Loopback, RFC1918, link-local (incl. cloud metadata at 169.254.169.254),
 * CGNAT, and the v6 equivalents.
 */
function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const p = ip.split(".").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = p as [number, number, number, number];
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (v === 6) {
    const s = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (s === "::" || s === "::1") return true;
    if (s.startsWith("fe80") || s.startsWith("fc") || s.startsWith("fd")) return true;
    if (s.startsWith("::ffff:")) return isPrivateAddress(s.slice(7)); // v4-mapped
    return false;
  }
  return true; // unparseable => refuse
}

/**
 * Resolve the host and refuse if it lands anywhere private.
 *
 * ⚠️ Known limit: this validates the address, then `fetch` resolves the name
 * AGAIN. A DNS entry that changes between the two calls (rebinding) is not
 * covered. Closing that properly means connecting by IP with a pinned Host
 * header, which breaks TLS SNI and certificate validation. The host allow-list
 * is what actually carries the security here — this check is defence in depth
 * for the case where an allow-listed CDN is itself compromised or misconfigured.
 */
async function resolvesPublicly(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivateAddress(hostname);
  try {
    const results = await lookup(hostname, { all: true });
    return results.length > 0 && results.every((r) => !isPrivateAddress(r.address));
  } catch {
    return false;
  }
}

/**
 * Fetch an allow-listed foreign image, following redirects MANUALLY so every
 * hop is re-checked. A permitted host that 302s to an internal address is the
 * classic way an allow-list gets walked past.
 */
async function fetchExternalImage(start: URL): Promise<Response | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedImageHost(url.hostname)) return null;
    if (!(await resolvesPublicly(url.hostname))) return null;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), EXT_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { Accept: "image/*,video/*;q=0.8" },
      });
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) return null;
      let next: URL;
      try {
        next = new URL(location, url);
      } catch {
        return null;
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") return null;
      url = next;
      continue;
    }
    return res.ok ? res : null;
  }
  return null; // redirect budget exhausted
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const segments = path ?? [];

  let upstream: Response;

  const external = externalUrlForProxy(segments);
  if (external) {
    const res = await fetchExternalImage(external);
    if (!res || !res.body) return notFound();
    upstream = res;
  } else {
    const upstreamPath = upstreamPathForProxy(segments);
    if (!upstreamPath) return notFound();
    try {
      // No API key: the upload route is public upstream and does not read one.
      upstream = await getUpstreamStream(upstreamPath, { timeoutMs: 15_000 });
    } catch {
      // Never surface which host failed, or why.
      return new Response("Image unavailable", {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  }

  if (!upstream.ok || !upstream.body) return notFound();

  // Refuse an oversized body before streaming it. Content-Length can lie, so the
  // stream is capped again below.
  const declared = Number(upstream.headers.get("content-length") ?? "");
  if (Number.isFinite(declared) && declared > MAX_BYTES) return notFound();

  // Header allow-list. Upstream response headers are NOT forwarded — they can
  // carry server banners, cache tags and request ids that describe the backend.
  const contentType = upstream.headers.get("content-type") ?? "";
  const typeOk = ALLOWED_TYPES.test(contentType.split(";")[0]?.trim() ?? "");
  // For a foreign CDN, an unexpected content type means we asked for an image and
  // got something else — refuse rather than relay it. (The upstream lane keeps the
  // older octet-stream fallback: that host is ours and its uploads are known.)
  if (external && !typeOk) return notFound();
  const safeType = typeOk ? contentType : "application/octet-stream";

  const headers = new Headers({
    "Content-Type": safeType,
    "Cache-Control": CACHE,
    "X-Content-Type-Options": "nosniff",
    // An SVG served inline can script; force it to download rather than render.
    ...(safeType.startsWith("image/svg") ? { "Content-Disposition": "attachment" } : {}),
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  // Content-Length is a claim, not a guarantee. Cap the actual bytes so a hostile
  // or misbehaving origin can't stream forever through us.
  let seen = 0;
  const capped = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > MAX_BYTES) {
          controller.error(new Error("image too large"));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );

  return new Response(capped, { status: 200, headers });
}
