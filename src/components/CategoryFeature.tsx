import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { MEDIA_HINTS } from "@/lib/site";
import type { PublicCategory } from "@/lib/public-types";

/**
 * "Browse by category" — the Weedmaps row: a sideways rail of wide pills, the
 * name on the left and the operator's picture bleeding off the right edge.
 * Sits directly under the hero, because it is the first question a shopper
 * answers (what KIND of thing) before brand or price.
 *
 * EVERY category gets a pill, in the operator's `sortOrder`. One without a
 * picture yet is the same pill with an empty right-hand side — the row must not
 * change shape as pictures are added, and the gap is the nudge ("that one still
 * wants a picture"). Pictures are set in the dashboard (Catalog → Categories),
 * so a client changes their own shop window without a deploy.
 */
export function CategoryFeature({ categories }: { categories: PublicCategory[] }) {
  if (categories.length === 0) return null;

  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="cat-feature-wrap" aria-labelledby="cats-head">
      <div className="wm-head">
        <h2 className="wm-title" id="cats-head">
          Browse by category
        </h2>
      </div>

      <ul className="cat-pills">
        {ordered.map((c) => (
          <li key={c.id}>
            <Link href={`/category/${c.id}`} className="cat-pill">
              <span className="cat-pill-name">{c.name}</span>
              <span className="cat-pill-art" data-empty={!c.image || undefined} aria-hidden>
                {c.video ? (
                  <video
                    src={c.video}
                    poster={c.image ?? undefined}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" />
                ) : MEDIA_HINTS ? (
                  <MediaSlot label={`${c.name} picture`} where="Catalog → Categories" />
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
