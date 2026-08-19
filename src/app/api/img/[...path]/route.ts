import { getUpstreamStream } from "@/lib/kamui/client";
import { upstreamPathForProxy } from "@/lib/kamui/images";

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

function notFound(): Response {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await params;
  const upstreamPath = upstreamPathForProxy(path ?? []);
  if (!upstreamPath) return notFound();

  let upstream: Response;
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

  if (!upstream.ok || !upstream.body) return notFound();

  // Header allow-list. Upstream response headers are NOT forwarded — they can
  // carry server banners, cache tags and request ids that describe the backend.
  const contentType = upstream.headers.get("content-type") ?? "";
  const safeType = ALLOWED_TYPES.test(contentType.split(";")[0]?.trim() ?? "")
    ? contentType
    : "application/octet-stream";

  const headers = new Headers({
    "Content-Type": safeType,
    "Cache-Control": CACHE,
    "X-Content-Type-Options": "nosniff",
    // An SVG served inline can script; force it to download rather than render.
    ...(safeType.startsWith("image/svg") ? { "Content-Disposition": "attachment" } : {}),
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
