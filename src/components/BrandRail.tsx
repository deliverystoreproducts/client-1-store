import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { MEDIA_HINTS } from "@/lib/site";
import type { PublicBrand } from "@/lib/public-types";

/**
 * "Shop by brand" — the Weedmaps shelf header: a row of square logo tiles with
 * the name underneath, scrolling sideways.
 *
 * Logos when the operator has set them (Catalog → Brands → the brand), a
 * wordmark tile when they have not — and null is the NORMAL case, not a
 * failure: most shops carry far more brands than they have artwork for. The
 * wordmark tile is a design in its own right (the brand's own name, large, on
 * a tinted square), so a rail with half its logos missing still reads as a
 * shelf and not as a page that failed to load.
 *
 * Ordered by depth: a brand with two products should not lead the rail just
 * because it starts with "A".
 */
export function BrandRail({ brands }: { brands: PublicBrand[] }) {
  if (brands.length === 0) return null;

  const ordered = [...brands].sort(
    (a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name),
  );

  return (
    <section className="brand-rail-wrap" aria-labelledby="brands-head">
      <div className="cat-row-head">
        <h2 className="cat-row-name" id="brands-head">
          Shop by brand
        </h2>
        <Link className="cat-row-all" href="/brands">
          All {brands.length} →
        </Link>
      </div>

      {/* Horizontal scroll rather than a wrapping grid: a shop with 40 brands
          would otherwise push the entire shelf below the fold. */}
      <ul className="brand-rail">
        {ordered.map((b) => (
          <li key={b.id}>
            <Link href={`/brand/${b.id}`} className="brand-tile">
              <span className="brand-tile-art" data-empty={!b.image || undefined}>
                {b.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.image} alt="" loading="lazy" />
                ) : (
                  <>
                    <span className="brand-tile-word" aria-hidden>
                      {b.name}
                    </span>
                    {MEDIA_HINTS ? (
                      <MediaSlot label={`${b.name} logo`} where="Catalog → Brands → the brand" className="brand-tile-hint" />
                    ) : null}
                  </>
                )}
              </span>
              <span className="brand-tile-name">{b.name}</span>
              <span className="brand-tile-n num">{b.productCount} items</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
