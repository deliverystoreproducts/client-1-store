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
 * REQUIRED BEFORE LAUNCH — set it in the dashboard (Settings → Business); this
 * env var is the fallback. California B&P § 26151(a) requires all advertising
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
export const LICENSE_PLACEHOLDER = "Licence number NOT SET — Settings → Business";

/**
 * ══════════════════════════════════════════════════════════════════════════
 *  OPERATOR-SUPPLIED FACTS — FALLBACKS. A developer cannot invent any of
 *  these, and since the dashboard's Settings → Business page exists they are
 *  edited THERE; a dashboard value wins over every env var below. Env remains
 *  for bootstrap and for running with the backend unreachable.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Same discipline as the licence number above: no defaults, and a loud
 * placeholder wherever one is missing, so an unfinished legal page cannot ship
 * looking finished. A plausible-looking wrong value on a cannabis storefront is
 * worse than a visibly blank one.
 *
 * Everything here is listed in README.md § "Operator checklist before launch".
 */

/** Exact legal entity name as registered with the DCC — 4 CCR § 15420(a)(1). */
export const LEGAL_ENTITY_NAME = (process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME || "").trim();

/** Local jurisdiction cannabis permit number, if the city/county issues one. */
export const LOCAL_PERMIT_NUMBER = (process.env.NEXT_PUBLIC_LOCAL_PERMIT_NUMBER || "").trim();

/** Postal address for privacy correspondence — CalOPPA contact requirement. */
export const PRIVACY_CONTACT_ADDRESS = (
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT_ADDRESS || ""
).trim();

/** Mailbox that actually receives access/deletion requests. */
export const PRIVACY_CONTACT_EMAIL = (process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "").trim();

/**
 * Effective date of the privacy policy and the terms — B&P § 22575(b)(4)
 * requires the policy to state one.
 *
 * Deliberately NOT `new Date()`. A policy that re-dates itself on every deploy
 * is a policy with no effective date at all, and it destroys the material-change
 * notice in § 22575(b)(3).
 */
export const POLICY_EFFECTIVE_DATE = (process.env.NEXT_PUBLIC_POLICY_EFFECTIVE_DATE || "").trim();

/**
 * The DCC's SB 540 safer-use brochure, hosted BY US.
 *
 * B&P § 26070.3(b) requires it to be prominently displayed online at the time
 * of online purchase. There is deliberately no default path: an unset value
 * prints a red placeholder at checkout, whereas a default would silently link
 * to a 404 and look compliant.
 *
 * Host the file on this origin — `public/` — not the DCC CDN. The whole site
 * makes no third-party browser request and the brochure must not be the
 * exception. The current PDFs are at
 * https://cdn.cannabis.ca.gov/wp-content/uploads/sites/2/2024/12/SB-540-color.pdf
 * (and -BW.pdf); § 26070.3 requires the DCC to recertify or update the brochure
 * by 1 Jan 2030 and every five years after, so re-check what is being served.
 */
export const SAFER_USE_BROCHURE_URL = (
  process.env.NEXT_PUBLIC_SAFER_USE_BROCHURE_URL || ""
).trim();

/**
 * Operator-facing placeholder for an unset business fact. Points at the
 * dashboard page (the primary way to set these now); the env vars documented in
 * .env.example remain as fallback. Deliberately loud — an unfinished legal page
 * must not ship looking finished.
 */
export const MISSING = (label: string) => `${label} NOT SET — Settings → Business`;

/** localStorage key for the browser-side cart. Namespaced to this store. */
export const CART_STORAGE_KEY = "ybs.cart.v1";


/**
 * Show "a picture goes here" scaffolding in every empty media slot.
 *
 * OFF by default, and it must stay off on a live shop: labelled placeholders
 * read as broken to a customer, and broken reads as untrustworthy on a site
 * that is about to ask for an address and a date of birth.
 *
 * Turn it on (`NEXT_PUBLIC_MEDIA_HINTS=on`) while setting a store up, so
 * whoever is loading the artwork can SEE which slots are still empty and which
 * dashboard screen fills each one. Turn it off before the first customer.
 */
export const MEDIA_HINTS = (process.env.NEXT_PUBLIC_MEDIA_HINTS || "").trim().toLowerCase() === "on";
