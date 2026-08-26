import Link from "next/link";
import {
  GENETICS,
  SORTS,
  activeFilterCount,
  browseQueryString,
  type BrowseFilters,
  type PinnedDimension,
} from "@/lib/catalog-query";
import type { PublicBrand, PublicCategory } from "@/lib/public-types";

/**
 * The shelf's filter rail.
 *
 * A plain GET <form>. No JavaScript, no client component, no state: the browser
 * serialises the controls into the query string and the server renders the
 * narrowed shelf. That is why it works on a cold cache, in a webview, with JS
 * blocked — and why the back button behaves.
 *
 * Two consequences worth knowing before editing:
 *
 *  1. Every control's `name` IS the URL contract in `catalog-query.ts`. Rename
 *     one here and the filter silently stops applying — the form will still
 *     submit, the server will still render, and nothing will look broken.
 *  2. A pinned dimension (the category on /category/5) is carried by the PATH.
 *     The form posts back to its own path, so it survives without a hidden
 *     input — and we must NOT emit one, or the query string would contradict
 *     the route.
 *
 * Collapsed groups use <details>, not a JS disclosure, for the same reason.
 * `open` is driven by whether that group currently has a value, so a customer
 * returning to a filtered URL sees which groups are doing something.
 */
export function FilterRail({
  filters,
  categories,
  brands,
  action,
  pinned = null,
  total,
  showCannabinoids,
}: {
  filters: BrowseFilters;
  categories: PublicCategory[];
  brands: PublicBrand[];
  /** Where the form submits — always the page's own path. */
  action: string;
  pinned?: PinnedDimension;
  total: number;
  /**
   * The operator's cannabinoid-display setting. When off, the THC control is
   * not rendered at all.
   *
   * This app is built for a cannabis retailer, but the platform behind it is a
   * general commerce API and the same storefront can be pointed at a store that
   * sells something else entirely — a THC filter on a shoe shop is the visible
   * symptom of assuming otherwise. Genetics is left alone deliberately: it is a
   * free-text column a non-cannabis shop simply leaves null, so the filter is
   * harmless there, whereas "THC %" names a compound.
   */
  showCannabinoids: boolean;
}) {
  const applied = activeFilterCount(filters, pinned);
  const priceOpen = filters.minPrice != null || filters.maxPrice != null;
  const thcOpen = filters.minThc != null || filters.maxThc != null;

  return (
    <form className="filters" method="get" action={action}>
      <div className="filters-head">
        <span className="eyebrow">Refine</span>
        {applied > 0 ? (
          <Link className="btn btn-link btn-sm" href={action}>
            Clear {applied}
          </Link>
        ) : null}
      </div>

      <div className="search">
        <label className="sr-only" htmlFor="f-q">
          Search products
        </label>
        <input
          id="f-q"
          type="search"
          name="q"
          defaultValue={filters.search}
          placeholder="Search the shelf…"
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="f-sort">
          Sort
        </label>
        <select className="select" id="f-sort" name="sort" defaultValue={filters.sortRaw}>
          {SORTS.map((s) => (
            <option key={s.value || "default"} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {pinned !== "category" && categories.length > 0 ? (
        <div className="field">
          <label className="label" htmlFor="f-category">
            Category
          </label>
          <select
            className="select"
            id="f-category"
            name="category"
            defaultValue={filters.categoryId ? String(filters.categoryId) : ""}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.productCount})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {pinned !== "brand" && brands.length > 0 ? (
        <div className="field">
          <label className="label" htmlFor="f-brand">
            Brand
          </label>
          <select
            className="select"
            id="f-brand"
            name="brand"
            defaultValue={filters.brandId ? String(filters.brandId) : ""}
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.productCount})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="field">
        <span className="label">Genetics</span>
        {/* Radios, not chips-as-links: they belong to this form's submission and
            must round-trip with everything else the customer has set. */}
        <div className="radio-row">
          <label className="radio">
            <input type="radio" name="genetics" value="" defaultChecked={!filters.genetics} />
            <span>Any</span>
          </label>
          {GENETICS.map((g) => (
            <label className="radio" key={g}>
              <input
                type="radio"
                name="genetics"
                value={g}
                defaultChecked={filters.genetics === g}
              />
              <span>{g}</span>
            </label>
          ))}
        </div>
      </div>

      <details className="filter-group" open={priceOpen}>
        <summary>Price</summary>
        <div className="range-row">
          <label className="sr-only" htmlFor="f-minPrice">
            Minimum price
          </label>
          <input
            className="input"
            id="f-minPrice"
            type="number"
            name="minPrice"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="Min $"
            defaultValue={filters.minPrice ?? ""}
          />
          <span className="range-dash" aria-hidden>
            –
          </span>
          <label className="sr-only" htmlFor="f-maxPrice">
            Maximum price
          </label>
          <input
            className="input"
            id="f-maxPrice"
            type="number"
            name="maxPrice"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="Max $"
            defaultValue={filters.maxPrice ?? ""}
          />
        </div>
      </details>

      {showCannabinoids ? (
      <details className="filter-group" open={thcOpen}>
        <summary>THC %</summary>
        <div className="range-row">
          <label className="sr-only" htmlFor="f-minThc">
            Minimum THC percentage
          </label>
          <input
            className="input"
            id="f-minThc"
            type="number"
            name="minThc"
            min="0"
            max="100"
            step="1"
            inputMode="numeric"
            placeholder="Min %"
            defaultValue={filters.minThc ?? ""}
          />
          <span className="range-dash" aria-hidden>
            –
          </span>
          <label className="sr-only" htmlFor="f-maxThc">
            Maximum THC percentage
          </label>
          <input
            className="input"
            id="f-maxThc"
            type="number"
            name="maxThc"
            min="0"
            max="100"
            step="1"
            inputMode="numeric"
            placeholder="Max %"
            defaultValue={filters.maxThc ?? ""}
          />
        </div>
        {/* Said plainly because it is not obvious and it loses sales: a shop that
            hasn't entered lab figures has NULL here, and a bounded query drops
            those rows entirely. */}
        <p className="small muted mt-1">
          Products without a published THC figure are hidden while this filter is set.
        </p>
      </details>
      ) : null}

      <label className="check">
        <input type="checkbox" name="onSale" value="true" defaultChecked={filters.onSale} />
        <span>On sale only</span>
      </label>

      <button className="btn btn-clay btn-block" type="submit">
        Show {total > 0 ? <span className="num">{total}</span> : null} result
        {total === 1 ? "" : "s"}
      </button>

      {/* Submitting resets to page 1 by omission — there is no page input here.
          Keeping one would strand a customer on page 4 of a shelf that now has
          one page. `browseQueryString` enforces the same rule for links. */}
      <noscript>
        <p className="small muted mt-1">Press “Show results” to apply your filters.</p>
      </noscript>
    </form>
  );
}

/**
 * The active-filter summary that sits above the grid, one removable pill per
 * applied filter. Links, not form controls — each is "this shelf without that
 * one constraint", which is a URL.
 */
export function ActiveFilters({
  filters,
  categories,
  brands,
  basePath,
  pinned = null,
  showCannabinoids = true,
}: {
  filters: BrowseFilters;
  categories: PublicCategory[];
  brands: PublicBrand[];
  basePath: string;
  pinned?: PinnedDimension;
  showCannabinoids?: boolean;
}) {
  const pills: { key: string; label: string; href: string }[] = [];
  const drop = (patch: Partial<BrowseFilters>) =>
    `${basePath}${browseQueryString(filters, patch, pinned)}`;

  if (filters.categoryId && pinned !== "category") {
    const c = categories.find((x) => x.id === filters.categoryId);
    pills.push({
      key: "category",
      label: c ? c.name : "Category",
      href: drop({ categoryId: undefined }),
    });
  }
  if (filters.brandId && pinned !== "brand") {
    const b = brands.find((x) => x.id === filters.brandId);
    pills.push({ key: "brand", label: b ? b.name : "Brand", href: drop({ brandId: undefined }) });
  }
  if (filters.genetics) {
    pills.push({ key: "genetics", label: filters.genetics, href: drop({ genetics: undefined }) });
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    const lo = filters.minPrice != null ? `$${filters.minPrice}` : "$0";
    const hi = filters.maxPrice != null ? `$${filters.maxPrice}` : "any";
    pills.push({
      key: "price",
      label: `${lo} – ${hi}`,
      href: drop({ minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (showCannabinoids && (filters.minThc != null || filters.maxThc != null)) {
    const lo = filters.minThc != null ? `${filters.minThc}%` : "0%";
    const hi = filters.maxThc != null ? `${filters.maxThc}%` : "any";
    pills.push({
      key: "thc",
      label: `THC ${lo} – ${hi}`,
      href: drop({ minThc: undefined, maxThc: undefined }),
    });
  }
  if (filters.onSale) {
    pills.push({ key: "onSale", label: "On sale", href: drop({ onSale: false }) });
  }
  if (filters.search) {
    pills.push({ key: "q", label: `“${filters.search}”`, href: drop({ search: "" }) });
  }

  if (pills.length === 0) return null;

  return (
    <div className="chips chips-active">
      {pills.map((p) => (
        <Link className="chip chip-remove" key={p.key} href={p.href}>
          {p.label}
          <i aria-hidden>×</i>
          <span className="sr-only">— remove this filter</span>
        </Link>
      ))}
      {pills.length > 1 ? (
        <Link className="btn btn-link btn-sm" href={basePath}>
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
