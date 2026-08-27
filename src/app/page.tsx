import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { BrandRail } from "@/components/BrandRail";
import { MediaSlot } from "@/components/MediaSlot";
import { CategoryFeature } from "@/components/CategoryFeature";
import { CategoryRow } from "@/components/CategoryRow";
import { FeaturedCarousel } from "@/components/FeaturedCarousel";
import { DealCard } from "@/components/DealCard";
import { DeliveryAreas, HighlightStrip } from "@/components/ShopWindow";
import {
  getBrands,
  getCatalogPage,
  getCategories,
  getCategoryBands,
  getFeaturedProducts,
  getDeals,
  getStoreProfile,
} from "@/lib/store";
import { DELIVERY_WINDOW_SHORT, deliveryWindowNotice, isWithinDeliveryWindow } from "@/lib/hours";

/**
 * Home / browse. Server-rendered, and the filters are a plain GET form: search,
 * category and sort all live in the URL, so every view is linkable, shareable
 * and works before any JavaScript loads.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;


// The default is HONEST: it says Newest and it IS newest. It used to say
// "Featured" while upstream defaulted to name-ASC, which made the shop window
// an ASCII wall of near-identical "$100 Ounce of the Day" rows (audit B3).
const SORTS = [
  { value: "", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name A–Z" },
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

  const [profile, categories, brands, deals, featured, results] = await Promise.all([
    getStoreProfile(),
    getCategories(),
    // Only for the shop window — a customer mid-search has told us what they came for.
    browsing ? Promise.resolve([]) : getBrands(),
    // Only worth fetching for the shop window — a customer who is already
    // filtering has told us what they came for.
    browsing ? Promise.resolve([]) : getDeals(),
    browsing ? Promise.resolve([]) : getFeaturedProducts(8),
    getCatalogPage({ search, categoryId, sort: sort ?? "newest", page, limit: PAGE_SIZE }),
  ]);

  // Needs `categories`, so it cannot join the Promise.all above. Skipped
  // entirely while browsing — the bands are shop-window furniture.
  const bands = browsing ? [] : await getCategoryBands(categories, { bands: 6, perBand: 4 });

  const pageHref = (n: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (categoryId) qs.set("category", String(categoryId));
    if (sortRaw) qs.set("sort", sortRaw);
    if (n > 1) qs.set("page", String(n));
    const s = qs.toString();
    return s ? `/?${s}#catalogue` : "/#catalogue";
  };

  /**
   * A category is a PLACE now (/category/5), not a query param on the home
   * page. It gets a URL a shop can print on a flyer, its own <title>, and its
   * own filter rail. The home page keeps `?category=` working for anyone
   * holding an old link — `categoryId` above still reads it — but nothing here
   * mints one any more.
   *
   * A search in progress rides along, so narrowing to a category does not throw
   * away what the customer typed.
   */
  const categoryHref = (id?: number) => {
    if (!id) return search ? `/?q=${encodeURIComponent(search)}` : "/";
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (sortRaw) qs.set("sort", sortRaw);
    const s = qs.toString();
    return s ? `/category/${id}?${s}` : `/category/${id}`;
  };

  // 4 CCR § 15403 caps delivery at 06:00–22:00 Pacific. We do not block ordering
  // on it (whether placement outside the window is lawful is unsettled) — we just
  // never let a customer find out after the fact.
  const openForDelivery = isWithinDeliveryWindow();
  const hoursNotice = deliveryWindowNotice();

  const activeCategory = categories.find((c) => c.id === categoryId);
  const firstOnPage = (page - 1) * PAGE_SIZE;

  // No stand-in photograph. This used to fall back to a stock Unsplash image,
  // which is the worst of both worlds: a real photograph of someone else's shop,
  // rendered as though it had been chosen, so an operator had no way to tell
  // their hero was unset and a customer saw a picture of a place that is not
  // this one. An empty slot is honest; a borrowed photo is not.
  const heroSrc = profile.heroImage;
  // Desktop cut if the operator supplied one, else the single video. One <video>
  // either way — swapping sources by breakpoint needs JS and would download
  // both on the crossover.
  const heroVideo = profile.heroVideoDesktop ?? profile.heroVideo;

  return (
    <>
      {!browsing ? (
        <section className="hero" data-media="true">
          {heroVideo ? (
            /* Video wins over the still when the operator has set one.
               muted + playsInline + autoPlay is the only combination a phone
               will start without a tap; `poster` keeps the frame from being
               empty while it buffers, so a slow connection degrades to the
               image rather than to a black box. No controls and aria-hidden:
               it is scenery, not media anyone came to watch. */
            <video
              className="hero-media hero-video"
              src={heroVideo}
              poster={heroSrc ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
            />
          ) : heroSrc ? (
            <>
              {/* The hero is a CSS background, invisible to the preload
                  scanner until style resolution — this link starts the fetch
                  with the document instead (React hoists it into <head>). */}
              <link rel="preload" as="image" fetchPriority="high" href={heroSrc} />
              <div
                className="hero-media"
                aria-hidden
                style={{ backgroundImage: `url(${heroSrc})` }}
              />
            </>
          ) : (
            <MediaSlot
              kind="video"
              className="hero-media"
              label="Hero banner"
              where="Settings → Branding → Hero banner"
            />
          )}

          <div className="hero-body">
            <div>
              <span className="eyebrow" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
                {profile.open ? "Open — taking orders" : "Browsing only right now"}
              </span>
              <h1
                className="display hero-title"
                data-reveal
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {profile.heroTitle || "Delivered to your door, today."}
              </h1>
              {/* The five-row plaque this replaced was a screen of furniture before
                  the first product. A store's first screen sells; the facts survive
                  as one strip a customer reads in two seconds. */}
              <p className="fact-strip" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
                <span className="fact">
                  <span
                    className="dot"
                    style={{ color: profile.open ? "var(--sage)" : "var(--pine-3)" }}
                    aria-hidden
                  />
                  {profile.open ? "Taking orders" : "Closed"}
                </span>
                <span className="fact">{DELIVERY_WINDOW_SHORT}</span>
                <span className="fact">Cash on delivery</span>
                <span className="fact">{profile.minAge}+ with valid ID at the door</span>
                {profile.contactPhone ? (
                  <a className="fact fact-tel link" href={`tel:${profile.contactPhone}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.25a2 2 0 0 1 2.1-.45c.9.34 1.84.57 2.8.7a2 2 0 0 1 1.7 2z"/>
          </svg>
          {profile.contactPhone}
        </a>
                ) : null}
              </p>
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

      {/* Directly under the hero: the three promises, then where we go. Both
          render nothing when the operator has not set them, so the page simply
          tightens up rather than showing empty furniture. */}
      {!browsing ? <HighlightStrip items={profile.highlights} /> : null}
      {!browsing ? <DeliveryAreas cities={profile.deliveryCities} /> : null}

      {/* Featured leads the shelf — hand-picked when the operator has picked,
          a spread of the catalogue when they have not, so the row is never an
          empty band under a promise. */}
      {featured.length > 0 ? (
        <section className="cat-row" aria-labelledby="featured-head">
          <div className="cat-row-head">
            <h2 className="cat-row-name" id="featured-head">
              Featured
            </h2>
            <Link className="cat-row-all" href="/products">
              View all →
            </Link>
          </div>
          <FeaturedCarousel products={featured} />
        </section>
      ) : null}

      {/* The shop window, in the order a customer shops it: who makes it, what
          kind it is, what's on offer, then everything else. Hidden the moment
          they start filtering — at that point they are shopping, not browsing. */}
      {!browsing ? <BrandRail brands={brands} /> : null}
      {!browsing ? <CategoryFeature categories={categories} /> : null}

      {deals.length > 0 ? (
        <section className="deals-strip" aria-labelledby="deals-head">
          <div className="section-head">
            <span className="eyebrow" id="deals-head">
              On offer
            </span>
            <hr />
            <Link className="btn btn-link btn-sm" href="/deals">
              All deals →
            </Link>
          </div>
          <div className="deals-row">
            {deals.slice(0, 3).map((d, i) => (
              <DealCard key={d.id} deal={d} index={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {/* A band per category, in the operator's order — the wayfinding a
          customer who knows the FORM they want (flower, carts, edibles) needs
          before they will scroll. "Everything else" is what is left after
          these, so the two never show the same product twice in the same
          scroll. */}
      {bands.map((b, i) => (
        <CategoryRow key={b.category.id} category={b.category} products={b.products} index={i} />
      ))}

      <section id="catalogue">
        <div className="section-head" data-reveal style={{ "--i": 5 } as React.CSSProperties}>
          <span className="eyebrow">
            {activeCategory ? activeCategory.name : search ? "Search" : "Everything else"}
          </span>
          <hr />
          {!results.unavailable && results.products.length > 0 ? (
            <span className="faint num">
              {results.total} item{results.total === 1 ? "" : "s"}
            </span>
          ) : null}
          <Link className="btn btn-link btn-sm" href="/products">
            Shop all &amp; filter →
          </Link>
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
              placeholder="Search the shelf…"
            />
            <button className="btn btn-ghost btn-sm" type="submit">
              Search
            </button>
          </div>
          {categoryId ? <input type="hidden" name="category" value={categoryId} /> : null}
          <div>
            <label className="sr-only" htmlFor="sort">
              Sort products
            </label>
            <select className="select select-quiet" id="sort" name="sort" defaultValue={sortRaw}>
              {SORTS.map((s) => (
                <option key={s.value || "default"} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* While browsing, the compact chip row stays — someone narrowing wants
            controls, not a shop window. The full brand rail and the category
            tiles live above, and only on the unfiltered page. */}
        {browsing && categories.length > 0 ? (
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
                <i className="chip-n num">{c.productCount}</i>
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
