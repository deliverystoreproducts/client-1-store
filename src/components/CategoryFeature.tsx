import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { MEDIA_HINTS } from "@/lib/site";
import { categoryIconUrl } from "@/lib/category-art";
import type { PublicCategory } from "@/lib/public-types";

/**
 * "Browse by category" — the Weedmaps row: a sideways rail of wide pills, the
 * name on the left and the operator's picture bleeding off the right edge.
 * Sits directly under the hero, because it is the first question a shopper
 * answers (what KIND of thing) before brand or price.
 *
 * EVERY category gets a pill, in the operator's `sortOrder`. The picture is
 * the operator's own (dashboard, Catalog → Categories) when they have set one;
 * otherwise a bundled icon matched by name (lib/category-art.ts) — "Flower",
 * "Vape Pens", "Infused Joints" all land on the right picture on day one, and
 * an upload later replaces it without a deploy. Only a name nothing matches
 * shows an empty right-hand side.
 */
export function CategoryFeature({ categories }: { categories: PublicCategory[] }) {
  if (categories.length === 0) return null;

  // sortOrder 0 means "never ordered by the operator" — those go LAST, so the
  // curated categories (1, 2, 3…) lead the rail instead of trailing it.
  const ordered = [...categories].sort((a, b) => (a.sortOrder || 9999) - (b.sortOrder || 9999));

  return (
    <section className="cat-feature-wrap" aria-labelledby="cats-head">
      <div className="wm-head">
        <h2 className="wm-title" id="cats-head">
          Browse by category
        </h2>
        <Link className="wm-more" href="/categories" aria-label="All categories">
          →
        </Link>
      </div>

      <ul className="cat-pills">
        {ordered.map((c) => {
          const art = c.image ?? categoryIconUrl(c.name);
          return (
          <li key={c.id}>
            <Link href={`/category/${c.id}`} className="cat-pill">
              <span className="cat-pill-name">{c.name}</span>
              <span className="cat-pill-art" data-empty={!art || undefined} aria-hidden>
                {c.video ? (
                  <video
                    src={c.video}
                    poster={c.image ?? undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : art ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={art} alt="" loading="lazy" />
                ) : MEDIA_HINTS ? (
                  <MediaSlot label={`${c.name} picture`} where="Catalog → Categories" />
                ) : null}
              </span>
            </Link>
          </li>
          );
        })}
      </ul>
    </section>
  );
}
