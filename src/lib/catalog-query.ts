/**
 * Browse-filter state: URL ⇄ object, in one place.
 *
 * Four pages now show the same shelf through different doors — /products,
 * /category/[id], /brand/[id], and the home page. They must agree on what
 * `?thcMin=20&genetics=indica` means, or a customer who narrows on one page and
 * navigates to another silently loses their filters.
 *
 * Everything lives in the URL and nothing in component state, for the same
 * reason the home page already worked that way: every view is linkable,
 * shareable, back-button-correct, and renders before any JavaScript loads.
 *
 * PINNING. On /category/5 the category is chosen by the route, not by a form
 * control. `pinned` names that dimension so the filter rail omits it and
 * `browseQueryString` never emits it — otherwise a stale `?category=` rides
 * along in the query string and contradicts the path.
 */

export type SortValue = "price_asc" | "price_desc" | "name_asc" | "newest";

export const SORTS = [
  { value: "", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name A–Z" },
] as const;

/**
 * Cannabis genetics, as the catalogue spells them. The values are matched
 * upstream against `Product.genetics` — a free-text column — so this list is
 * the *vocabulary we offer*, not a guarantee the shop uses it. A shop that
 * types "Indica-dominant" simply won't match the "indica" filter; that is a
 * data-entry question, not something to paper over with fuzzy matching here.
 */
export const GENETICS = ["indica", "sativa", "hybrid"] as const;

/** Which dimension the ROUTE owns, so the rail must not offer it. */
export type PinnedDimension = "category" | "brand" | null;

export interface BrowseFilters {
  search: string;
  categoryId?: number;
  brandId?: number;
  genetics?: string;
  minPrice?: number;
  maxPrice?: number;
  minThc?: number;
  maxThc?: number;
  onSale: boolean;
  /** The raw sort param, kept verbatim so <select defaultValue> round-trips. */
  sortRaw: string;
  sort?: SortValue;
  page: number;
}

type SearchParamBag = Record<string, string | string[] | undefined>;

function one(sp: SearchParamBag, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A number the upstream will accept, or undefined.
 *
 * Clamped to a sane range rather than passed through: these land in a price /
 * percentage filter, and `?minPrice=-1e9` is not a query anyone typed. NaN and
 * Infinity both fall out here, so the upstream never sees them.
 */
function bounded(raw: string, min: number, max: number): number | undefined {
  if (raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

const MAX_PRICE = 100_000;

export function parseBrowseFilters(sp: SearchParamBag): BrowseFilters {
  const sortRaw = one(sp, "sort");
  const sort = SORTS.some((s) => s.value === sortRaw && s.value)
    ? (sortRaw as SortValue)
    : undefined;

  const geneticsRaw = one(sp, "genetics").toLowerCase();
  const genetics = (GENETICS as readonly string[]).includes(geneticsRaw)
    ? geneticsRaw
    : undefined;

  let minPrice = bounded(one(sp, "minPrice"), 0, MAX_PRICE);
  let maxPrice = bounded(one(sp, "maxPrice"), 0, MAX_PRICE);
  // An inverted range returns nothing at all, which reads to a customer as "this
  // shop is empty". Swapping is what they meant, and it is not destructive.
  if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  let minThc = bounded(one(sp, "minThc"), 0, 100);
  let maxThc = bounded(one(sp, "maxThc"), 0, 100);
  if (minThc != null && maxThc != null && minThc > maxThc) {
    [minThc, maxThc] = [maxThc, minThc];
  }

  return {
    search: one(sp, "q").slice(0, 120),
    categoryId: Number(one(sp, "category")) || undefined,
    brandId: Number(one(sp, "brand")) || undefined,
    genetics,
    minPrice,
    maxPrice,
    minThc,
    maxThc,
    onSale: one(sp, "onSale") === "true",
    sortRaw,
    sort,
    page: Math.max(1, Number(one(sp, "page")) || 1),
  };
}

/**
 * How many filters the customer has actually applied — the number on the
 * "Clear all" control. Search and sort are deliberately excluded: sort is
 * always set to something, and search has its own visible input, so counting
 * them would show "2 filters" on a shelf nobody has narrowed.
 */
export function activeFilterCount(f: BrowseFilters, pinned: PinnedDimension = null): number {
  let n = 0;
  if (f.categoryId && pinned !== "category") n += 1;
  if (f.brandId && pinned !== "brand") n += 1;
  if (f.genetics) n += 1;
  if (f.minPrice != null || f.maxPrice != null) n += 1;
  if (f.minThc != null || f.maxThc != null) n += 1;
  if (f.onSale) n += 1;
  return n;
}

/**
 * Serialize back to a query string, with `patch` overriding any field.
 *
 * `page` is dropped by every patch that is not itself a page change: narrowing
 * a filter while on page 4 of the old result set would otherwise land the
 * customer on an empty page 4 of the new one.
 */
export function browseQueryString(
  f: BrowseFilters,
  patch: Partial<BrowseFilters> = {},
  pinned: PinnedDimension = null,
): string {
  const m = { ...f, ...patch };
  const resetPage = !("page" in patch);
  const sp = new URLSearchParams();

  if (m.search) sp.set("q", m.search);
  if (m.categoryId && pinned !== "category") sp.set("category", String(m.categoryId));
  if (m.brandId && pinned !== "brand") sp.set("brand", String(m.brandId));
  if (m.genetics) sp.set("genetics", m.genetics);
  if (m.minPrice != null) sp.set("minPrice", String(m.minPrice));
  if (m.maxPrice != null) sp.set("maxPrice", String(m.maxPrice));
  if (m.minThc != null) sp.set("minThc", String(m.minThc));
  if (m.maxThc != null) sp.set("maxThc", String(m.maxThc));
  if (m.onSale) sp.set("onSale", "true");
  if (m.sortRaw) sp.set("sort", m.sortRaw);
  const page = resetPage ? 1 : m.page;
  if (page > 1) sp.set("page", String(page));

  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** The subset the catalog API takes. Keeps `sortRaw`/`page` bookkeeping out of it. */
export function toCatalogQuery(f: BrowseFilters, limit: number) {
  return {
    search: f.search || undefined,
    categoryId: f.categoryId,
    brandId: f.brandId,
    genetics: f.genetics,
    minPrice: f.minPrice,
    maxPrice: f.maxPrice,
    minThc: f.minThc,
    maxThc: f.maxThc,
    onSale: f.onSale || undefined,
    sort: f.sort ?? ("newest" as const),
    page: f.page,
    limit,
  };
}
