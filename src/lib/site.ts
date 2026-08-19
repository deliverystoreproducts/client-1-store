/**
 * Brand-level constants that ARE meant for the browser.
 *
 * Everything here is inlined into client JavaScript at build time. Only put
 * things here that you would be happy to see in view-source — a store name, a
 * tagline. Never a URL of the backend, never a key.
 */

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "YB Cannabis Co.";
export const SITE_TAGLINE =
  process.env.NEXT_PUBLIC_SITE_TAGLINE || "Same-day cannabis delivery, paid at the door.";
export const SITE_SHORT_NAME = process.env.NEXT_PUBLIC_SITE_SHORT_NAME || SITE_NAME;

/** Minimum legal age. Overridden at runtime by the store profile when it loads. */
export const DEFAULT_MIN_AGE = Number(process.env.NEXT_PUBLIC_MIN_AGE || "21") || 21;

/** localStorage key for the browser-side cart. Namespaced to this store. */
export const CART_STORAGE_KEY = "ybs.cart.v1";
