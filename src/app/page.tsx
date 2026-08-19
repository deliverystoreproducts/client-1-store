import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogPage, getCategories, getStoreProfile } from "@/lib/store";
import { SITE_TAGLINE } from "@/lib/site";

/**
 * Home / browse. Server-rendered, and the filters are a plain GET form: search,
 * category and sort all live in the URL, so every view is linkable, shareable
 * and works before any JavaScript loads.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const SORTS = [
  { value: "", label: "Featured" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name A–Z" },
  { value: "newest", label: "Newest" },
] as const;

function param(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const search = param(sp, "q").slice(0, 120);
  const categoryId = Number(param(sp, "category")) || undefined;
  const sortRaw = param(sp, "sort");
  const sort = SORTS.some((s) => s.value === sortRaw && s.value)
    ? (sortRaw as "price_asc" | "price_desc" | "name_asc" | "newest")
    : undefined;
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const browsing = !!(search || categoryId || sort || page > 1);

  const [profile, categories, results] = await Promise.all([
    getStoreProfile(),
    getCategories(),
    getCatalogPage({ search, categoryId, sort, page, limit: PAGE_SIZE }),
  ]);

  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (categoryId) qs.set("category", String(categoryId));
    if (sortRaw) qs.set("sort", sortRaw);
    if (n > 1) qs.set("page", String(n));
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  };

  const categoryHref = (id?: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (id) qs.set("category", String(id));
    if (sortRaw) qs.set("sort", sortRaw);
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <>
      {!browsing ? (
        <section
          className="hero"
          style={
            profile.heroImage
              ? { backgroundImage: `linear-gradient(rgb(14 16 15 / 0.72), rgb(14 16 15 / 0.86)), url(${profile.heroImage})` }
              : undefined
          }
        >
          <h1>{profile.heroTitle || "Delivered to your door, today."}</h1>
          <p>{profile.heroSubtitle || SITE_TAGLINE}</p>
        </section>
      ) : null}

      {!profile.open ? (
        <div className="notice notice-error" style={{ marginBottom: 20 }}>
          We&apos;re not taking orders right now. Please check back soon.
        </div>
      ) : null}

      <form className="filters" method="get" action="/">
        <input
          className="input"
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Search flower, edibles, brands…"
          aria-label="Search products"
        />
        {categoryId ? <input type="hidden" name="category" value={categoryId} /> : null}
        <select className="select" name="sort" defaultValue={sortRaw} aria-label="Sort products">
          {SORTS.map((s) => (
            <option key={s.value || "default"} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {categories.length > 0 ? (
        <div className="chips">
          <Link className="chip" href={categoryHref()} data-active={!categoryId}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              className="chip"
              href={categoryHref(c.id)}
              data-active={categoryId === c.id}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {results.unavailable ? (
        <div className="empty">
          <h2>The shop is briefly unavailable</h2>
          <p>We couldn&apos;t load the catalog just now. Please try again in a moment.</p>
        </div>
      ) : results.products.length === 0 ? (
        <div className="empty">
          <p>Nothing matches that yet.</p>
          {browsing ? (
            <Link className="btn btn-ghost" href="/">
              Clear filters
            </Link>
          ) : (
            <p className="faint">This store hasn&apos;t published any products yet.</p>
          )}
        </div>
      ) : (
        <>
          <p className="faint" style={{ marginBottom: 14 }}>
            {results.total} product{results.total === 1 ? "" : "s"}
          </p>
          <div className="grid">
            {results.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {results.totalPages > 1 ? (
            <div className="pager">
              {page > 1 ? (
                <Link className="btn btn-ghost btn-sm" href={pageHref(page - 1)}>
                  ← Previous
                </Link>
              ) : null}
              <span className="faint" style={{ alignSelf: "center" }}>
                Page {page} of {results.totalPages}
              </span>
              {page < results.totalPages ? (
                <Link className="btn btn-ghost btn-sm" href={pageHref(page + 1)}>
                  Next →
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
