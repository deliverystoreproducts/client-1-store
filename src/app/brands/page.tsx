import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/store";

/**
 * The brand index — an A–Z directory, grouped by first character.
 *
 * Counts are shown next to every name on purpose. A directory of bare names
 * makes a customer click to find out whether a brand has two products or forty;
 * the count answers that before the click, and it tells them the shop is deep
 * before they have committed to anything.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brands",
  description: "Every brand on the shelf, A–Z.",
};

/** Anything that isn't A–Z (a number, a symbol) files under "#". */
function initial(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

export default async function BrandsPage() {
  const brands = await getBrands();

  const groups = new Map<string, typeof brands>();
  for (const b of [...brands].sort((a, b) => a.name.localeCompare(b.name))) {
    const k = initial(b.name);
    const g = groups.get(k);
    if (g) g.push(b);
    else groups.set(k, [b]);
  }
  // "#" last, letters in order — a directory reads A→Z, with the oddities after.
  const letters = [...groups.keys()].sort((a, b) =>
    a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b),
  );

  return (
    <section>
      <div className="section-head">
        <span className="eyebrow">Brands</span>
        <hr />
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
        <>
          {letters.length > 1 ? (
            <nav className="alpha-jump" aria-label="Jump to letter">
              {letters.map((l) => (
                <a className="chip" key={l} href={`#letter-${l === "#" ? "other" : l}`}>
                  {l}
                </a>
              ))}
            </nav>
          ) : null}

          {letters.map((l) => (
            <div className="alpha-group" key={l}>
              <h2 className="alpha-head" id={`letter-${l === "#" ? "other" : l}`}>
                {l}
              </h2>
              <ul className="brand-index">
                {(groups.get(l) ?? []).map((b) => (
                  <li key={b.id}>
                    <Link href={`/brand/${b.id}`}>
                      <span className="brand-index-name">{b.name}</span>
                      <span className="brand-index-n num">{b.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
