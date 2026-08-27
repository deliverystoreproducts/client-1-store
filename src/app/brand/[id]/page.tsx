import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveFilters, FilterRail } from "@/components/FilterRail";
import { ProductResults } from "@/components/ProductResults";
import { parseBrowseFilters, toCatalogQuery } from "@/lib/catalog-query";
import { getBrand, getBrands, getCatalogPage, getCategories, getStoreProfile } from "@/lib/store";

/**
 * A brand landing page — the same shape as /category/[id] with the other
 * dimension pinned. Customers shop cannabis by brand at least as often as by
 * category, and a brand with no page of its own cannot be linked to from
 * anywhere: not a flyer, not the brand's own social account, not a search
 * result.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = Number((await params).id);
  const brand = Number.isFinite(id) ? await getBrand(id) : null;
  if (!brand) return { title: "Brand" };
  return {
    title: brand.name,
    description: `Shop ${brand.name} — ${brand.productCount} item${
      brand.productCount === 1 ? "" : "s"
    } available for delivery.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const raw = parseBrowseFilters(await searchParams);
  const filters = { ...raw, brandId: id };

  const [profile, brand, categories, brands, results] = await Promise.all([
    getStoreProfile(),
    getBrand(id),
    getCategories(),
    getBrands(),
    getCatalogPage(toCatalogQuery(filters, PAGE_SIZE)),
  ]);

  if (!brand) notFound();

  const basePath = `/brand/${id}`;

  return (
    <section>
      <nav className="crumb" aria-label="Breadcrumb">
        <Link href="/brands">Brands</Link>
        <span aria-hidden>/</span>
        <span>{brand.name}</span>
      </nav>

      <div className="section-head">
        <span className="eyebrow">{brand.name}</span>
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
            pinned="brand"
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
            pinned="brand"
            showCannabinoids={profile.showCannabinoids}
          />
          <ProductResults
            results={results}
            filters={filters}
            basePath={basePath}
            pinned="brand"
            pageSize={PAGE_SIZE}
            emptyHint={`Nothing from ${brand.name} right now.`}
          />
        </div>
      </div>
    </section>
  );
}
