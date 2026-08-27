import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveFilters, FilterRail } from "@/components/FilterRail";
import { ProductResults } from "@/components/ProductResults";
import { parseBrowseFilters, toCatalogQuery } from "@/lib/catalog-query";
import { getBrands, getCatalogPage, getCategories, getCategory, getStoreProfile } from "@/lib/store";

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
    getBrands(),
    getCatalogPage(toCatalogQuery(filters, PAGE_SIZE)),
  ]);

  if (!category) notFound();

  const basePath = `/category/${id}`;

  return (
    <section>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/products">Shop all</Link>
        <span aria-hidden>/</span>
        <span>{category.name}</span>
      </nav>

      <div className="section-head">
        <span className="eyebrow">{category.name}</span>
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
            brands={brands}
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
