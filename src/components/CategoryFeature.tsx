import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import type { PublicCategory } from "@/lib/public-types";

/**
 * "Choose a category" — the reference storefront's row of round pictures with
 * the name underneath. EVERY category gets a circle, in the operator's order.
 *
 * A category with no artwork yet shows a quiet neutral disc, not a chip in a
 * different row: the shape of the shelf must not change as pictures are added
 * one by one, and a plain grey circle next to photographed ones is exactly the
 * nudge an operator needs ("that one still wants a picture"). The picture is
 * set in the dashboard (Catalog → Categories), so a client changes their own
 * shop window without a deploy.
 *
 * Order is the operator's `sortOrder`, carried through from the platform rather
 * than re-sorted here. They chose it; a storefront that quietly re-sorts by
 * product count is overriding a merchandising decision.
 */
export function CategoryFeature({ categories }: { categories: PublicCategory[] }) {
  if (categories.length === 0) return null;

  const ordered = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <section className="cat-feature-wrap" aria-labelledby="cats-head">
      <div className="cat-row-head">
        <div>
          <span className="eyebrow eyebrow-accent">Pick your vibe</span>
          <h2 className="cat-row-name" id="cats-head">
            Choose a category
          </h2>
        </div>
        <Link className="cat-row-all" href="/products">
          View all →
        </Link>
      </div>

      <ul className="cat-circles">
        {ordered.map((c, i) => (
          <li key={c.id}>
            <Link
              href={`/category/${c.id}`}
              className="cat-circle"
              data-reveal
              style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
            >
              <span className="cat-circle-art" data-empty={!c.image || undefined}>
                {c.video ? (
                  // Muted+autoplay+playsInline is the only combination a phone
                  // will start without a tap; the image is the poster so the
                  // disc is never blank while it loads.
                  <video
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
                  <img src={c.image} alt="" loading="lazy" />
                ) : (
                  <MediaSlot label={`${c.name} picture`} where="Catalog → Categories → the category" />
                )}
              </span>
              <span className="cat-circle-name">{c.name}</span>
              <span className="cat-circle-n num">{c.productCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
