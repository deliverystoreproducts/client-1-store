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
 * - absolute URL somewhere else     -> passed through (a third-party CDN says
 *                                      nothing about our backend)
 * - anything else / unparseable     -> null, and the UI shows a placeholder
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
  return url.toString();
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
