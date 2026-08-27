import Link from "next/link";
import type { PublicBrand } from "@/lib/public-types";

/**
 * Every brand, across the top — the Weedmaps-style shelf header.
 *
 * TYPOGRAPHIC, NOT LOGOS, and that is a data fact rather than a taste one:
 * `PosBrand` has no image column, so the platform has no brand artwork to send.
 * Inventing one per storefront would mean art that lives in a fork and dies
 * with it. If brand logos are wanted, the column belongs on `PosBrand` so the
 * operator sets it once and every storefront gets it — the same route category
 * pictures took.
 *
 * The count is doing real work here (a shopper learns the shop is deep before
 * clicking) and it is also the ordering: a brand with two products should not
 * sit first just because it starts with "A".
 */
export function BrandRail({ brands }: { brands: PublicBrand[] }) {
  if (brands.length === 0) return null;

  const ordered = [...brands].sort(
    (a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name),
  );

  return (
    <section className="brand-rail-wrap" aria-labelledby="brands-head">
      <div className="section-head">
        <span className="eyebrow" id="brands-head">
          Shop by brand
        </span>
        <hr />
        <Link className="btn btn-link btn-sm" href="/brands">
          All {brands.length} →
        </Link>
      </div>

      {/* Horizontal scroll rather than a wrapping grid: a shop with 40 brands
          would otherwise push the entire shelf below the fold. */}
      <ul className="brand-rail">
        {ordered.map((b) => (
          <li key={b.id}>
            <Link href={`/brand/${b.id}`} className="brand-chip">
              <span className="brand-chip-name">{b.name}</span>
              <span className="brand-chip-n num">{b.productCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
