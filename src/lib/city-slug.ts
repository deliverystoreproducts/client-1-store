/**
 * GEO-01: the URL form of a delivery city.
 *
 * "Huntington Beach" → "huntington-beach", "Arden-Arcade" → "arden-arcade",
 * "Rancho Cucamonga" → "rancho-cucamonga". Pure, so /delivery/[city] can map a
 * path segment back to a zone by comparing slugs rather than storing one.
 */
export function citySlug(city: string): string {
  return city
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
