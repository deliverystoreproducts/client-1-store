import { getUpstreamStream } from "@/lib/kamui/client";
import { fail } from "@/lib/http";

/**
 * GET /api/orders/track/[token]/map — the tracking map, as an image.
 *
 * The upstream renders it server-side with Google Static Maps and streams the
 * PNG back, because it holds the tenant's Maps key in its credential vault. So
 * this storefront needs no maps dependency, no key, and — importantly — no CSP
 * change: `img-src 'self'` already covers a same-origin PNG, whereas a maps SDK
 * would need `script-src` and `connect-src` exceptions and would end the
 * "browser talks only to this app" invariant.
 *
 * The tracking token IS the credential, upstream and here. It is the same
 * capability model as the sibling JSON route, which is why this route takes no
 * session: a customer who follows a tracking link from an SMS is not signed in.
 *
 * Upstream distinguishes "no positions yet" (422) from "no such order" (404)
 * from "the shop has no Maps key" (422). None of that is worth explaining to a
 * customer — every one of them means "there is no map to show right now" — so
 * they collapse to 404 here and the component simply doesn't render an image.
 * The one thing we must not do is render a broken image icon on a page whose
 * job is to reassure someone their order is coming.
 */

export const dynamic = "force-dynamic";

/** Bounded so a malformed link cannot become a long upstream path. */
const TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) return fail(404, "not_found");

  let upstream: Response;
  try {
    upstream = await getUpstreamStream(
      `/api/store/v1/orders/track/${encodeURIComponent(token)}/map`,
      { withApiKey: true },
    );
  } catch {
    return fail(404, "not_found");
  }

  if (!upstream.ok || !upstream.body) return fail(404, "not_found");

  const type = upstream.headers.get("content-type") ?? "";
  // Only ever hand the browser an image. Upstream returns JSON for every
  // refusal, and streaming that through with an image's Content-Type would put
  // an upstream error message inside an <img> on a public page.
  if (!type.startsWith("image/")) return fail(404, "not_found");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": type,
      // Matches upstream's own window. The driver is moving, so a long cache
      // would show a stale position; no cache at all would bill a Static Maps
      // call on every repaint of a page that polls.
      "Cache-Control": "private, max-age=15",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
