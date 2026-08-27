import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/store";

/**
 * The brand index — a wall of logo tiles, biggest shelf first, the same tile as
 * the home page's "Featured brands" rail so the two read as one thing. A brand
 * with no logo yet (the platform's or the bundled table's) shows its name as
 * the mark, so the wall is never a mix of pictures and holes.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brands",
  description: "Every brand on the shelf.",
};

export default async function BrandsPage() {
  const brands = await getBrands();
  const ordered = [...brands].sort(
    (a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name),
  );

  return (
    <section>
      <div className="wm-head">
        <h1 className="wm-title">Brands</h1>
        {brands.length > 0 ? (
          <span className="faint num">
            {brands.length} brand{brands.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {brands.length === 0 ? (
        <div className="empty">
          <h2>No brands to show yet</h2>
          <p className="muted">
            Either this store hasn&apos;t grouped its products by brand, or the catalogue is
            briefly out of reach.
          </p>
          <p className="mt-2">
            <Link className="btn btn-ghost" href="/products">
              Browse everything instead
            </Link>
          </p>
        </div>
      ) : (
        <ul className="brand-grid">
          {ordered.map((b) => (
            <li key={b.id}>
              <Link href={`/brand/${b.id}`} className="brand-tile">
                <span className="brand-tile-art" data-empty={!b.image || undefined}>
                  {b.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image} alt="" loading="lazy" />
                  ) : (
                    <span className="brand-tile-word" aria-hidden>
                      {b.name}
                    </span>
                  )}
                </span>
                <span className="brand-tile-name">{b.name}</span>
                <span className="brand-tile-n num">{b.productCount} items</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
