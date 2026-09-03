import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveFilters, FilterRail } from "@/components/FilterRail";
import { ProductResults } from "@/components/ProductResults";
import { parseBrowseFilters, toCatalogQuery } from "@/lib/catalog-query";
import { getBrand, getBrands, getCatalogPage, getCategories, getCategory, getStoreProfile } from "@/lib/store";

/**
 * A category landing page.
 *
 * Exists so a category is a PLACE with a URL a shop can put on a flyer, not a
 * transient `?category=5` on the home page. The category is pinned by the
 * route: the rail hides its own category control and never emits the param, so
 * the path stays the single source of truth for which shelf this is.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = Number((await params).id);
  const category = Number.isFinite(id) ? await getCategory(id) : null;
  if (!category) return { title: "Category" };
  return {
    title: category.name,
    description: `Browse ${category.name} — ${category.productCount} item${
      category.productCount === 1 ? "" : "s"
    } available for delivery.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const raw = parseBrowseFilters(await searchParams);
  // The path wins over any inherited `?category=`.
  const filters = { ...raw, categoryId: id };

  const [profile, category, categories, brands, results] = await Promise.all([
    getStoreProfile(),
    getCategory(id),
    getCategories(),
    // Only brands that actually have something in THIS category. The dropdown
    // used to list the whole shop with shop-wide counts, so Vape Pens offered
    // "Froot (9)" — nine products, all Edibles — and 26 other dead ends.
    getBrands(id),
    getCatalogPage(toCatalogQuery(filters, PAGE_SIZE)),
  ]);

  if (!category) notFound();

  // A bookmark or a shared link can still carry a brand that has nothing here —
  // that is the bug above, and links outlive it. Resolve its NAME anyway so the
  // active-filter chip reads "Froot ×" instead of the bare fallback "Brand ×".
  const missingSelected =
    filters.brandId && !brands.some((b) => b.id === filters.brandId)
      ? await getBrand(filters.brandId)
      : null;
  const chipBrands = missingSelected ? [...brands, missingSelected] : brands;

  const basePath = `/category/${id}`;

  return (
    <section>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/products">Shop all</Link>
        <span aria-hidden>/</span>
        <span>{category.name}</span>
      </nav>

      <div className="wm-head">
        <h1 className="wm-title">{category.name}</h1>
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
            action={basePath}
            pinned="category"
            total={results.total}
            showCannabinoids={profile.showCannabinoids}
          />
        </aside>

        <div className="shelf-body">
          <ActiveFilters
            filters={filters}
            categories={categories}
            brands={chipBrands}
            basePath={basePath}
            pinned="category"
            showCannabinoids={profile.showCannabinoids}
          />
          <ProductResults
            results={results}
            filters={filters}
            basePath={basePath}
            pinned="category"
            pageSize={PAGE_SIZE}
            emptyHint={`Nothing in ${category.name} right now.`}
          />
        </div>
      </div>
    </section>
  );
}
