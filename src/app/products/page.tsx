import type { Metadata } from "next";
import { ActiveFilters, FilterRail } from "@/components/FilterRail";
import { ProductResults } from "@/components/ProductResults";
import { parseBrowseFilters, toCatalogQuery } from "@/lib/catalog-query";
import { getBrands, getCatalogPage, getCategories, getStoreProfile } from "@/lib/store";

/**
 * The whole shelf, with every filter the catalogue supports.
 *
 * The home page keeps its short rail (search, category chips, sort) because it
 * is a shop window — a customer who lands there should see product, not a
 * control panel. This page is the opposite: it is for someone who already knows
 * roughly what they want and is narrowing.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop all",
  description: "Browse the full menu — filter by category, brand, genetics, price and THC.",
};

const PAGE_SIZE = 24;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBrowseFilters(await searchParams);

  const [profile, categories, brands, results] = await Promise.all([
    getStoreProfile(),
    getCategories(),
    getBrands(),
    getCatalogPage(toCatalogQuery(filters, PAGE_SIZE)),
  ]);

  return (
    <section>
      <div className="section-head">
        <span className="eyebrow">Shop all</span>
        <hr />
        {!results.unavailable ? (
          <span className="faint num">
            {results.total} item{results.total === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="shelf">
        <aside className="shelf-rail">
          <FilterRail
            filters={filters}
            categories={categories}
            brands={brands}
            action="/products"
            total={results.total}
            showCannabinoids={profile.showCannabinoids}
          />
        </aside>

        <div className="shelf-body">
          <ActiveFilters
            filters={filters}
            categories={categories}
            brands={brands}
            basePath="/products"
            showCannabinoids={profile.showCannabinoids}
          />
          <ProductResults
            results={results}
            filters={filters}
            basePath="/products"
            pageSize={PAGE_SIZE}
            emptyHint="This store hasn't published any products yet."
          />
        </div>
      </div>
    </section>
  );
}
