import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { MEDIA_HINTS } from "@/lib/site";
import type { PublicBrand } from "@/lib/public-types";

/**
 * Every brand, across the top — the Weedmaps-style shelf header.
 *
 * Logos when the operator has set them, the brand's name when they have not —
 * and null is the NORMAL case, not a failure: most shops carry far more brands
 * than they have artwork for. A rail that looked broken for every logo-less
 * brand would look broken on almost every shop, so the wordmark treatment has
 * to be a design in its own right rather than a fallback.
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
            <Link href={`/brand/${b.id}`} className="brand-chip" data-art={!!b.image || undefined}>
              {b.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <span className="brand-chip-art">
                  <img src={b.image} alt="" loading="lazy" />
                </span>
              ) : MEDIA_HINTS ? (
                <span className="brand-chip-art">
                  <MediaSlot label={`${b.name} logo`} where="Catalog → Brands → the brand" />
                </span>
              ) : null}
              <span className="brand-chip-name">{b.name}</span>
              <span className="brand-chip-n num">{b.productCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
