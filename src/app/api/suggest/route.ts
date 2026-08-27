import { getBrands, getCatalogPage, getCategories } from "@/lib/store";
import { json } from "@/lib/http";

/**
 * GET /api/suggest?q=… — the header search dropdown.
 *
 * Three groups, because a shopper's query is often not a product name: "sativa"
 * is a filter, "Nike" is a brand, "boots" is a category. Returning only
 * products makes those three queries look like a shop with nothing in it.
 *
 * Categories and brands are matched HERE, in memory, on purpose. Both lists are
 * small (tens, low hundreds) and already cached for 300s by the upstream
 * client, so filtering them locally costs one cache read instead of two more
 * round trips — and it gives prefix-before-substring ordering, which the
 * upstream's single-token `contains` does not do.
 *
 * ⚠ Product search quality is upstream's and it is weak: one token, `contains`,
 * no ranking. "blue dream 8th" matches nothing because it is three tokens. This
 * route cannot fix that; it makes it more visible, which is the honest place
 * for it to be. A local index built from `/catalog/export` is the real answer
 * and is a separate piece of work.
 */

export const dynamic = "force-dynamic";

const LIMIT_PRODUCTS = 6;
const LIMIT_TAXONOMY = 4;
const MIN_Q = 2;

/** Prefix matches first, then substring — "boo" should surface Boots above Reebok. */
function rank<T extends { name: string }>(rows: T[], q: string, limit: number): T[] {
  const needle = q.toLowerCase();
  const scored = rows
    .map((r) => {
      const n = r.name.toLowerCase();
      const at = n.indexOf(needle);
      return { r, at };
    })
    .filter((x) => x.at >= 0)
    .sort((a, b) => a.at - b.at || a.r.name.localeCompare(b.r.name));
  return scored.slice(0, limit).map((x) => x.r);
}

export async function GET(req: Request): Promise<Response> {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < MIN_Q) return json({ products: [], categories: [], brands: [] });

  // One product query upstream; the taxonomies come from cached lists.
  const [page, categories, brands] = await Promise.all([
    getCatalogPage({ search: q, limit: LIMIT_PRODUCTS, sort: "newest" }),
    getCategories(),
    getBrands(),
  ]);

  return json({
    products: page.products.slice(0, LIMIT_PRODUCTS).map((p) => ({
      id: p.id,
      name: p.name,
      // The image is already OUR proxied url — the mapper rewrote it.
      image: p.image,
      unitPrice: p.unitPrice,
    })),
    categories: rank(categories, q, LIMIT_TAXONOMY).map((c) => ({
      id: c.id,
      name: c.name,
      productCount: c.productCount,
    })),
    brands: rank(brands, q, LIMIT_TAXONOMY).map((b) => ({
      id: b.id,
      name: b.name,
      productCount: b.productCount,
    })),
  });
}
