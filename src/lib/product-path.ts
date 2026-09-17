/**
 * BLOG-01 — product URLs carry the name: `/product/wedding-cake-3-5g-300000123`.
 *
 * The id is the ONLY identity (Weedmaps renames products on every sync); the
 * slug is decoration for people and for search. Anything that reaches the
 * page with a stale or missing slug is permanently redirected to the current
 * one, so old links never break and renames self-heal. Pure: no imports.
 */
export function productSlug(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function productPath(p: { id: number; name: string }): string {
  const slug = productSlug(p.name);
  return slug ? `/product/${slug}-${p.id}` : `/product/${p.id}`;
}

/** The id inside a `/product/<anything>-<id>` or `/product/<id>` segment, else null. */
export function productIdFromParam(param: string): number | null {
  const m = /(?:^|-)(\d+)$/.exec(param);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}
