import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogPage, getCategories, getStoreProfile } from "@/lib/store";
import { SITE_TAGLINE } from "@/lib/site";
import { DELIVERY_WINDOW_SHORT, deliveryWindowNotice, isWithinDeliveryWindow } from "@/lib/hours";

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
    return s ? `/?${s}#catalogue` : "/#catalogue";
  };

  const categoryHref = (id?: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (id) qs.set("category", String(id));
    if (sortRaw) qs.set("sort", sortRaw);
    const s = qs.toString();
    return s ? `/?${s}` : "/";
  };

  // 4 CCR § 15403 caps delivery at 06:00–22:00 Pacific. We do not block ordering
  // on it (whether placement outside the window is lawful is unsettled) — we just
  // never let a customer find out after the fact.
  const openForDelivery = isWithinDeliveryWindow();
  const hoursNotice = deliveryWindowNotice();

  const activeCategory = categories.find((c) => c.id === categoryId);
  const firstOnPage = (page - 1) * PAGE_SIZE;

  return (
    <>
      {!browsing ? (
        <section className="hero">
          {profile.heroImage ? (
            <div
              className="hero-media"
              aria-hidden
              style={{ backgroundImage: `url(${profile.heroImage})` }}
            />
          ) : null}

          <div className="hero-body">
            <div>
              <span className="eyebrow" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
                Same-day delivery · Cash at the door
              </span>
              <h1
                className="display hero-title"
                data-reveal
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {profile.heroTitle || "Delivered to your door, today."}
              </h1>
              <p
                className="lede hero-lede"
                data-reveal
                style={{ "--i": 2 } as React.CSSProperties}
              >
                {profile.heroSubtitle || SITE_TAGLINE}
              </p>
              <div
                className="hero-actions"
                data-reveal
                style={{ "--i": 3 } as React.CSSProperties}
              >
                <Link className="btn" href="#catalogue">
                  Shop the shelf
                </Link>
                <Link className="btn btn-ghost" href="/track">
                  Track an order
                </Link>
              </div>
            </div>

            <div className="plaque" data-reveal style={{ "--i": 4 } as React.CSSProperties}>
              <div className="plaque-row">
                <span className="eyebrow">Status</span>
                <span className="plaque-value">
                  <span
                    className="dot"
                    style={{ color: profile.open ? "var(--sage)" : "var(--bone-3)" }}
                    aria-hidden
                  />
                  {profile.open ? "Taking orders" : "Closed"}
                </span>
              </div>
              <div className="plaque-row">
                <span className="eyebrow">Delivery</span>
                <span className="plaque-value">{DELIVERY_WINDOW_SHORT}</span>
              </div>
              <div className="plaque-row">
                <span className="eyebrow">Payment</span>
                <span className="plaque-value">Cash on delivery</span>
              </div>
              <div className="plaque-row">
                <span className="eyebrow">At the door</span>
                <span className="plaque-value">{profile.minAge}+ with valid ID</span>
              </div>
              {profile.contactPhone ? (
                <div className="plaque-row">
                  <span className="eyebrow">Questions</span>
                  <a className="plaque-value link" href={`tel:${profile.contactPhone}`}>
                    {profile.contactPhone}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {!profile.open ? (
        <div className="notice notice-error mb-3">
          <strong>We&apos;re not taking orders right now.</strong> You can still browse — please
          check back soon.
        </div>
      ) : !openForDelivery ? (
        <div className="notice mb-3">
          <strong>Outside delivery hours.</strong> {hoursNotice} Order any time — it goes out when
          the window opens.
        </div>
      ) : null}

      <section id="catalogue">
        <div className="section-head" data-reveal style={{ "--i": 5 } as React.CSSProperties}>
          <span className="eyebrow">
            {activeCategory ? activeCategory.name : search ? "Search" : "The shelf"}
          </span>
          <hr />
          {!results.unavailable && results.products.length > 0 ? (
            <span className="faint num">
              {results.total} item{results.total === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <form className="rail" method="get" action="/" data-reveal style={{ "--i": 6 } as React.CSSProperties}>
          <div className="search">
            <label className="sr-only" htmlFor="q">
              Search products
            </label>
            <input
              id="q"
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search flower, edibles, brands…"
            />
            <button className="btn btn-sm" type="submit">
              Search
            </button>
          </div>
          {categoryId ? <input type="hidden" name="category" value={categoryId} /> : null}
          <div>
            <label className="sr-only" htmlFor="sort">
              Sort products
            </label>
            <select className="select" id="sort" name="sort" defaultValue={sortRaw}>
              {SORTS.map((s) => (
                <option key={s.value || "default"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {categories.length > 0 ? (
          <div className="chips" data-reveal style={{ "--i": 7 } as React.CSSProperties}>
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
            <h2>The shelf is briefly out of reach</h2>
            <p className="muted">
              We couldn&apos;t load the catalogue just now. Please try again in a moment.
            </p>
          </div>
        ) : results.products.length === 0 ? (
          <div className="empty">
            <h2>Nothing matches that yet</h2>
            {browsing ? (
              <p className="mt-2">
                <Link className="btn btn-ghost" href="/">
                  Clear filters
                </Link>
              </p>
            ) : (
              <p className="muted">This store hasn&apos;t published any products yet.</p>
            )}
          </div>
        ) : (
          <>
            <div className="catalogue">
              {results.products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={firstOnPage + i + 1} />
              ))}
            </div>

            {results.totalPages > 1 ? (
              <nav className="pager" aria-label="Pagination">
                {page > 1 ? (
                  <Link className="btn btn-ghost btn-sm" href={pageHref(page - 1)}>
                    ← Previous
                  </Link>
                ) : null}
                <span className="eyebrow num">
                  Page {page} / {results.totalPages}
                </span>
                {page < results.totalPages ? (
                  <Link className="btn btn-ghost btn-sm" href={pageHref(page + 1)}>
                    Next →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </>
  );
}
