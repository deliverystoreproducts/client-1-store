import "server-only";

import { upstreamOrigin } from "./env";

/**
 * Image URL custody.
 *
 * The upstream catalog stores image references as RELATIVE paths in its own URL
 * space — "/api/uploads/foo.jpg" — and the DTO mapper hands that raw value
 * straight to the client. Two problems, one fix:
 *
 *   1. Rendered as-is on our origin, "/api/uploads/foo.jpg" is a 404 here.
 *   2. Rewritten to the upstream absolute URL, every product tile in the page
 *      source names the backend. That is the one thing this storefront must
 *      never do.
 *
 * So: we mint "/api/img/<path>" and stream the bytes through our own route.
 */

const UPLOADS_PREFIX = "/api/uploads";
const PROXY_PREFIX = "/api/img";
/** Sub-path under PROXY_PREFIX for foreign-CDN images. */
const EXT_SEGMENT = "ext";

/**
 * Hosts whose images we are willing to fetch on a visitor's behalf.
 *
 * Why an allow-list and not "any https URL the catalog gives us": this route
 * fetches a URL chosen by data we do not own. Left open it is an SSRF primitive
 * (point it at 169.254.169.254 or an internal service) and a free bandwidth
 * relay. Closed by default; an unknown host is refused, never passed through.
 *
 * Configurable because suppliers change — a new CDN should be an env edit, not
 * a deploy of new code.
 */
function allowedImageHosts(): Set<string> {
  const raw = process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? "images.weedmaps.com";
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Exact host match only. A suffix match would let `evil-images.weedmaps.com.attacker.tld` through. */
export function isAllowedImageHost(host: string): boolean {
  return allowedImageHosts().has(host.toLowerCase());
}

/** Path segments are filenames, never traversal. Upstream validates too; we do
 *  not rely on that — this route must not become an open proxy. */
const SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;

function segmentsFromUploadPath(pathname: string): string[] | null {
  if (!pathname.startsWith(`${UPLOADS_PREFIX}/`)) return null;
  const rest = pathname.slice(UPLOADS_PREFIX.length + 1);
  if (!rest) return null;
  const segments = rest.split("/");
  if (segments.length < 1 || segments.length > 2) return null;
  // The only two shapes upstream serves: /api/uploads/<file> and
  // /api/uploads/video/<file>.
  if (segments.length === 2 && segments[0] !== "video") return null;
  if (!segments.every((s) => SEGMENT_RE.test(s))) return null;
  return segments;
}

/**
 * Wire image value -> something safe to put in HTML.
 *
 * - relative upload path            -> /api/img/... (proxied)
 * - absolute URL on the upstream    -> /api/img/... (proxied, host stripped)
 * - absolute URL on an ALLOWED CDN  -> /api/img/ext/... (proxied)
 * - absolute URL anywhere else      -> null (refused, placeholder shown)
 * - anything else / unparseable     -> null, and the UI shows a placeholder
 *
 * Foreign CDNs used to be passed through on the reasoning that a third-party
 * host says nothing about our backend. True, but it says something about our
 * VISITOR: their IP reaches that CDN on every catalog page, and the CDN learns
 * the catalog's provenance. The whole point of this app is that a browser here
 * talks to this origin and nothing else, so those go through the proxy too.
 */
export function toPublicImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("/")) {
    const segments = segmentsFromUploadPath(value.split("?")[0] ?? "");
    return segments ? `${PROXY_PREFIX}/${segments.join("/")}` : null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  let sameOrigin = false;
  try {
    sameOrigin = url.origin === upstreamOrigin();
  } catch {
    // Not configured — treat as foreign and refuse rather than emit anything.
    return null;
  }
  if (sameOrigin) {
    const segments = segmentsFromUploadPath(url.pathname);
    return segments ? `${PROXY_PREFIX}/${segments.join("/")}` : null;
  }

  if (!isAllowedImageHost(url.hostname)) return null;
  // base64url: no "/", "+" or "=", so it survives a path segment untouched.
  const encoded = Buffer.from(url.toString(), "utf8").toString("base64url");
  return `${PROXY_PREFIX}/${EXT_SEGMENT}/${encoded}`;
}

/**
 * Decode an /api/img/ext/<b64url> request back to the URL to fetch.
 *
 * Re-validates from scratch rather than trusting that we minted it — the value
 * arrives from the client and a signature would be the only proof of origin.
 * Returns null on anything not an http(s) URL on an allow-listed host.
 */
export function externalUrlForProxy(segments: string[]): URL | null {
  if (segments.length !== 2 || segments[0] !== EXT_SEGMENT) return null;
  const encoded = segments[1];
  if (!encoded || encoded.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }

  let url: URL;
  try {
    url = new URL(decoded);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null; // credentials-in-URL is never legitimate here
  if (!isAllowedImageHost(url.hostname)) return null;
  return url;
}

/**
 * The reverse, used by the proxy route. Returns the upstream path to fetch, or
 * null when the request is not a shape we serve.
 */
export function upstreamPathForProxy(segments: string[]): string | null {
  if (segments.length < 1 || segments.length > 2) return null;
  if (segments.length === 2 && segments[0] !== "video") return null;
  if (!segments.every((s) => SEGMENT_RE.test(s))) return null;
  return `${UPLOADS_PREFIX}/${segments.join("/")}`;
}
