/**
 * Routes that stay reachable WITHOUT answering the age gate.
 *
 * Only the legal notices. Two reasons, and neither is convenience:
 *
 *  1. CalOPPA (B&P § 22575) requires the privacy policy to be *conspicuously
 *     posted*. The age gate is itself a point of collection — it sets a cookie
 *     before anyone has read anything — so putting the policy behind it is
 *     circular: the link on the gate would lead back to the gate.
 *  2. Neither page renders a single byte of catalogue data, so letting them
 *     through costs the gate nothing. The thing the gate protects is the
 *     product list in the RSC flight payload (see src/proxy.ts); /privacy and
 *     /terms are static legal prose.
 *
 * Pure module, no imports: it is read by `src/proxy.ts` (edge runtime) AND by
 * `src/app/layout.tsx` (node runtime), and both must agree.
 */

/**
 * Request header the proxy stamps on an open route so the root layout can tell
 * "the proxy deliberately let this through" from "the gate has been answered".
 *
 * The proxy DELETES any inbound copy before setting it, so a client cannot
 * forge it. Even if one somehow could, the prize is a page of legal text.
 */
export const OPEN_ROUTE_HEADER = "x-ybs-open-route";

/**
 * `/contact` is open for a practical reason rather than a legal one: it is the
 * support channel. Somebody whose delivery went wrong — on a different device,
 * or after the gate cookie expired — should not have to assert their age before
 * they can find a phone number. There is no product data on that page.
 *
 * `/faq` and `/returns` stay GATED. Both discuss what may be purchased and in
 * what quantity, which is close enough to a menu to keep behind the gate.
 */
export const OPEN_ROUTES = ["/privacy", "/terms", "/contact"] as const;

export function isOpenRoute(pathname: string): boolean {
  const p = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return (OPEN_ROUTES as readonly string[]).includes(p);
}
