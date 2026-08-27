import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import { MEDIA_HINTS } from "@/lib/site";
import type { PublicCategory } from "@/lib/public-types";

/**
 * The featured category tiles — big type over the operator's own artwork.
 *
 * WHAT MAKES A CATEGORY FEATURED: it has a picture. There is no separate flag,
 * because a flag is a second control that can contradict the first — a category
 * marked featured with no art renders as an empty frame, and one with art but
 * unflagged is work the operator did for nothing. Uploading the picture IS the
 * act of featuring it, and the operator does that in the dashboard, so a client
 * changes their own shop window without a deploy.
 *
 * Order is the operator's `sortOrder`, carried through from the platform rather
 * than re-sorted here. They chose it; a storefront that quietly re-sorts by
 * product count is overriding a merchandising decision.
 */
export function CategoryFeature({ categories }: { categories: PublicCategory[] }) {
  const byOrder = (a: PublicCategory, b: PublicCategory) => a.sortOrder - b.sortOrder;

  /**
   * With hints on, EVERY category gets a tile — including the ones with no
   * artwork, which render an empty slot.
   *
   * That is the whole point of the setup mode: a category with no picture
   * normally drops quietly into the plain row, which is exactly where an
   * operator looking for "where do I put the picture?" will never find it. On a
   * live shop it goes back to art-only, because a wall of empty frames is not a
   * shop window.
   */
  const featured = (MEDIA_HINTS ? categories : categories.filter((c) => c.featured)).sort(byOrder);
  const plain = (MEDIA_HINTS ? [] : categories.filter((c) => !c.featured)).sort(byOrder);

  if (categories.length === 0) return null;

  return (
    <section className="cat-feature-wrap" aria-labelledby="cats-head">
      <div className="section-head">
        <span className="eyebrow" id="cats-head">
          Shop by category
        </span>
        <hr />
      </div>

      {featured.length > 0 ? (
        <div className="cat-feature">
          {featured.map((c, i) => (
            <Link
              key={c.id}
              href={`/category/${c.id}`}
              className="cat-tile"
              data-reveal
              style={{ "--i": Math.min(i, 8) } as React.CSSProperties}
            >
              {c.video ? (
                // Muted+autoplay+playsInline is the only combination a phone
                // will start without a tap; the image is the poster so the tile
                // is never a blank rectangle while it loads.
                <video
                  className="cat-tile-media"
                  src={c.video}
                  poster={c.image ?? undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-hidden
                />
              ) : c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cat-tile-media" src={c.image} alt="" loading="lazy" />
              ) : (
                <MediaSlot
                  className="cat-tile-media"
                  label={`${c.name} picture`}
                  where="Catalog → Categories → the category"
                />
              )}
              <span className="cat-tile-scrim" aria-hidden />
              <span className="cat-tile-body">
                <span className="cat-tile-name">{c.name}</span>
                <span className="cat-tile-n num">
                  {c.productCount} item{c.productCount === 1 ? "" : "s"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {/* Categories without artwork are still places you can go — they just do
          not get a shop-window tile. This is also the nudge: an operator sees
          their category sitting in the plain row and knows how to promote it. */}
      {plain.length > 0 ? (
        <div className="chips chips-active mt-2">
          {plain.map((c) => (
            <Link className="chip chip-remove" key={c.id} href={`/category/${c.id}`}>
              {c.name}
              <i className="num" aria-hidden>
                {c.productCount}
              </i>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
