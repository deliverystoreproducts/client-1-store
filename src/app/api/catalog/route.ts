import { failFromUpstream, json } from "@/lib/http";
import { getCatalogPage, type CatalogQuery } from "@/lib/store";
import { parseBrowseFilters, toCatalogQuery } from "@/lib/catalog-query";

/**
 * GET /api/catalog — the browsable catalog, for client-side search and paging.
 *
 * The pages themselves render server-side and call the read model directly; this
 * route exists for interactive filtering without a full navigation, and as the
 * documented seam for whoever restyles this store.
 */

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const sp = new URL(req.url).searchParams;
  // The same parser the shelf pages use, so the feed's second page is filtered
  // exactly like the server-rendered first one — genetics, price, THC included.
  const bag: Record<string, string> = {};
  sp.forEach((v, k) => {
    bag[k] = v;
  });
  const filters = parseBrowseFilters(bag);
  const limitRaw = Number(sp.get("limit"));
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(48, limitRaw) : 24;
  const query: CatalogQuery = {
    ...toCatalogQuery(filters, limit),
    featured: sp.get("featured") === "true" || undefined,
  };

  try {
    return json(await getCatalogPage(query));
  } catch (e) {
    return failFromUpstream(e);
  }
}
