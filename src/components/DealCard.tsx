import Link from "next/link";
import { MediaSlot } from "@/components/MediaSlot";
import type { PublicDeal } from "@/lib/public-types";

/**
 * How a deal is labelled on the shelf.
 *
 * `type` is free text a shop configures, so this maps the two the platform's
 * engine actually implements and falls back to the raw value rather than
 * inventing a name for something we don't recognise. A deal labelled with its
 * own unrecognised type is honest; one labelled "Bundle" because that was the
 * default is not.
 */
function typeLabel(type: string): string {
  switch (type.toLowerCase()) {
    case "bundle":
      return "Bundle";
    case "bogo":
      return "Buy one, get one";
    default:
      return type || "Offer";
  }
}

/**
 * "Ends Friday" — but only when the end is near enough to be a reason to act.
 *
 * A deal expiring in four months is not urgency, it is noise, and dating it
 * makes the shelf look stale. Returns null well before that.
 */
function endsSoon(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const days = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (days < 0 || days > 14) return null;
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

export function DealCard({ deal, index }: { deal: PublicDeal; index?: number }) {
  const ends = endsSoon(deal.endsAt);

  return (
    <article
      className="deal"
      data-reveal
      style={{ "--i": Math.min(index ?? 0, 12) } as React.CSSProperties}
    >
      <Link href={`/deal/${deal.id}`} className="deal-frame" aria-label={deal.name}>
        {deal.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="deal-media" src={deal.image} alt="" loading="lazy" />
        ) : (
          <MediaSlot
            className="deal-media"
            label="Deal picture"
            where="Deals → the deal → Picture"
          />
        )}
        <span className="deal-type tag">{typeLabel(deal.type)}</span>
      </Link>

      <div className="deal-body">
        <h3 className="deal-name">
          <Link href={`/deal/${deal.id}`}>{deal.name}</Link>
        </h3>
        {deal.description ? <p className="deal-copy">{deal.description}</p> : null}
        {ends ? <p className="deal-ends small">{ends}</p> : null}
      </div>
    </article>
  );
}
