/**
 * Built-in category artwork, matched by NAME.
 *
 * A shop's categories come from its menu sync with names like "Flower",
 * "Infused Pre Roll", "Vape Pens", "Big Buds", "Joints" — and until the
 * operator uploads a picture for each, the "Browse by category" row would be a
 * rail of empty pills. This maps a category name onto one of ten bundled icons
 * (public/categories/*.png) so the row is full on day one.
 *
 * RULES OF PRECEDENCE: a picture set in the dashboard ALWAYS wins. This is only
 * the fallback for a category with no artwork of its own, and it never writes
 * anything back — the operator's data stays the operator's.
 *
 * Matching is by keyword on the lower-cased name. Order matters: "Infused Pre
 * Roll" must hit `infused` before `pre roll`, and "Disposable" is a vape.
 */

const ICONS = [
  ["infused-pre-roll", ["infused"]],
  ["pre-roll", ["pre roll", "pre-roll", "preroll", "joint", "blunt"]],
  ["vape-pens", ["vape", "cart", "disposable", "pod", "pen", "battery"]],
  ["concentrates", ["concentrate", "extract", "rosin", "resin", "wax", "shatter", "dab", "hash", "badder", "diamond"]],
  ["edibles", ["edible", "gumm", "chocolate", "candy", "cookie", "baked"]],
  ["drinks", ["drink", "beverage", "soda", "tea", "shot"]],
  ["tincture", ["wellness", "tincture", "topical", "cbd", "capsule", "balm", "cream", "patch", "sleep"]],
  ["gear", ["gear", "accessor", "glass", "paper", "grinder", "merch", "apparel"]],
  ["cultivation", ["cultivation", "seed", "clone", "genetic", "grow"]],
  ["flower", ["flower", "bud", "eighth", "ounce", "shake", "smalls", "indoor"]],
] as const;

export type CategoryIcon = (typeof ICONS)[number][0];

export function categoryIconFor(name: string | null | undefined): CategoryIcon | null {
  const n = (name ?? "").toLowerCase().replace(/[_\-]+/g, " ").trim();
  if (!n) return null;
  for (const [icon, words] of ICONS) {
    if (words.some((w) => n.includes(w))) return icon;
  }
  return null;
}

/** Same-origin path to the bundled icon, or null when nothing matches. */
export function categoryIconUrl(name: string | null | undefined): string | null {
  const icon = categoryIconFor(name);
  return icon ? `/categories/${icon}.png` : null;
}
