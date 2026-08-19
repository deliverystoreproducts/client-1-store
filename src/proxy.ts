import { NextResponse, type NextRequest } from "next/server";
import { OPEN_ROUTE_HEADER, isOpenRoute } from "@/lib/open-routes";

/**
 * THE AGE GATE, ENFORCED BEFORE ANY PAGE CODE RUNS.
 *
 * (`src/proxy.ts` is Next 16's name for what used to be `middleware.ts` — same
 * hook, default export instead of a named one.)
 *
 * Why this exists here and not just as a branch in the layout:
 *
 * A layout that renders `<AgeGate/>` instead of `{children}` hides the store
 * VISUALLY, but the App Router still renders the page segment and serialises it
 * into the RSC flight payload inlined in the HTML. Measured on this app before
 * this file existed: a request with an empty cookie jar returned the gate on
 * screen and all 24 products — names, prices, categories, product URLs — inside
 * `<script>self.__next_f.push(...)</script>`. View-source defeated the gate
 * completely, and the response was 62 KB instead of 11 KB. An age gate that only
 * wins in the pixels is not a control.
 *
 * So the decision is made here, before a route is chosen: without the
 * confirmation cookie every navigable URL is REWRITTEN to `/age`, so the catalog
 * page function is never invoked and there is nothing to serialise.
 *
 * Rewrite, not redirect, on purpose — the address bar keeps the URL the visitor
 * asked for, so confirming lands them on the product they clicked rather than
 * dumping them on the home page.
 *
 * This is a routing control only. It reads one cookie. It does not touch data
 * fetching, the upstream client or the API key.
 */

/** Mirrors `AGE_COOKIE` in src/lib/session.ts. This file cannot import that
 *  module (it is `server-only` and Node-flavoured), so the name is duplicated
 *  deliberately — change both together. */
const AGE_COOKIE = "__Host-ybs_age";

const GATE_PATH = "/age";

export default function proxy(req: NextRequest) {
  const passed = req.cookies.get(AGE_COOKIE)?.value === "1";
  const { pathname } = req.nextUrl;

  // The legal notices stay reachable without answering the gate — see
  // src/lib/open-routes.ts for why. The header is how the root layout learns
  // that THIS file made that decision; any inbound copy is deleted first, so a
  // client cannot claim it for /product/1.
  const headers = new Headers(req.headers);
  headers.delete(OPEN_ROUTE_HEADER);
  const open = isOpenRoute(pathname);
  if (open) headers.set(OPEN_ROUTE_HEADER, "1");
  const forward = { request: { headers } };

  if (passed) {
    // Nothing left to answer; /age is not a page anyone should sit on.
    if (pathname === GATE_PATH) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next(forward);
  }

  if (pathname === GATE_PATH || open) return NextResponse.next(forward);

  return NextResponse.rewrite(new URL(GATE_PATH, req.url), forward);
}

export const config = {
  /**
   * Everything a person can navigate to. Deliberately NOT matched:
   *   /api/*   — `/api/age` is how the gate is answered, and the other routes
   *              are same-origin fetches from pages that are already gated.
   *   /_next/* — build output.
   *   /fonts/* — the self-hosted webfaces; the gate itself needs them.
   */
  matcher: ["/((?!api|_next/static|_next/image|fonts|favicon.ico|robots.txt).*)"],
};
