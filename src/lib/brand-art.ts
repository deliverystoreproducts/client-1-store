import logos from "@/data/brand-logos.json";

/**
 * Built-in brand logos, matched by NAME.
 *
 * `src/data/brand-logos.json` is a { normalisedName: logoUrl } table generated
 * from the public Weedmaps brand directory by `scripts/build-brand-logos.mjs`.
 * A shop's brands come from its menu sync with the same names Weedmaps uses
 * ("STIIIZY", "West Coast Cure", "PLUGPLAY™"), so most of them land on a logo
 * on day one instead of a wordmark tile.
 *
 * RULES OF PRECEDENCE: a logo set in the dashboard ALWAYS wins. This is only
 * the fallback for a brand with no artwork of its own, and it never writes
 * anything back. The URL is on images.weedmaps.com, which the image proxy
 * already allows (product photos come from there) — the browser still only
 * ever sees our own /api/img/… path.
 */

const TABLE: Record<string, string> = logos as Record<string, string>;

/** "PLUGPLAY™" → "plugplay", "Dab Daddy Ⓡ" → "dab daddy", "The Cake House" → "cake house". */
export function normalizeBrandName(name: string | null | undefined): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[™®©Ⓡ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the\s+/, "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Square 400px cut of the brand's avatar, or null when the name is unknown. */
export function brandLogoUrl(name: string | null | undefined): string | null {
  const key = normalizeBrandName(name);
  if (!key) return null;
  const url = TABLE[key];
  if (!url) return null;
  // images.weedmaps.com takes Imgix-style params — a square crop at tile size
  // instead of the original, which can be several MB.
  return `${url}${url.includes("?") ? "&" : "?"}w=400&h=400&fit=crop&auto=format`;
}

/** How many brands the bundled table knows. Exposed for tests and the build script. */
export const BRAND_LOGO_COUNT = Object.keys(TABLE).length;
