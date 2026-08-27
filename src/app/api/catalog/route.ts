import { failFromUpstream, json } from "@/lib/http";
import { getCatalogPage, type CatalogQuery } from "@/lib/store";

/**
 * GET /api/catalog — the browsable catalog, for client-side search and paging.
 *
 * The pages themselves render server-side and call the read model directly; this
 * route exists for interactive filtering without a full navigation, and as the
 * documented seam for whoever restyles this store.
 */

export const dynamic = "force-dynamic";

const SORTS = new Set(["price_asc", "price_desc", "name_asc", "newest"]);

function intParam(sp: URLSearchParams, key: string): number | undefined {
  const raw = sp.get(key);
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function GET(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  const sortRaw = sp.get("sort");

  const query: CatalogQuery = {
    search: sp.get("q")?.slice(0, 120) || undefined,
    categoryId: intParam(sp, "category"),
    brandId: intParam(sp, "brand"),
    sort: sortRaw && SORTS.has(sortRaw) ? (sortRaw as CatalogQuery["sort"]) : undefined,
    page: intParam(sp, "page") ?? 1,
    limit: Math.min(48, intParam(sp, "limit") ?? 24),
    onSale: sp.get("onSale") === "true" || undefined,
    featured: sp.get("featured") === "true" || undefined,
  };

  try {
    return json(await getCatalogPage(query));
  } catch (e) {
    return failFromUpstream(e);
  }
}
