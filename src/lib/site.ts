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

/**
 * The retailer's state cannabis licence number.
 *
 * REQUIRED BEFORE LAUNCH. California B&P § 26151(a) requires all advertising
 * and marketing to "accurately and legibly identify the licensee responsible
 * for its content, by adding, at a minimum, the licensee's license number" — a
 * retailer's own webstore is marketing, so this belongs in the footer and on the
 * order receipt.
 *
 * There is no default and there must never be one: a made-up licence number on a
 * cannabis storefront is worse than a missing one. When unset the UI prints a
 * loud placeholder rather than nothing, so it cannot be shipped unnoticed.
 */
export const LICENSE_NUMBER = (process.env.NEXT_PUBLIC_LICENSE_NUMBER || "").trim();

/** What the UI shows when the operator has not supplied a number yet. */
export const LICENSE_PLACEHOLDER = "SET NEXT_PUBLIC_LICENSE_NUMBER";

/** localStorage key for the browser-side cart. Namespaced to this store. */
export const CART_STORAGE_KEY = "ybs.cart.v1";
