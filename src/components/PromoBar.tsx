import Link from "next/link";

/**
 * The strip across the very top.
 *
 * Entirely operator-controlled (STORE-WIN1): blank copy hides the bar, because
 * an empty coloured band is worse than none at all. The link is optional — with
 * no href it is a statement, not a control, and it must not look tappable.
 *
 * Replaces the env-var announcement + coupon-derived line this used to build:
 * both meant a redeploy to change a campaign, and the coupon-derived version
 * could only ever say one thing.
 */
export function PromoBar({
  text,
  badge,
  href,
}: {
  text: string | null;
  badge: string | null;
  href: string | null;
}) {
  if (!text) return null;

  const body = (
    <>
      {badge ? <span className="promo-badge">{badge}</span> : null}
      <span className="promo-text">{text}</span>
      {href ? (
        <span className="promo-go" aria-hidden>
          →
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <div className="promo-bar" role="status">
        <div className="wrap promo-inner">{body}</div>
      </div>
    );
  }

  return (
    <div className="promo-bar">
      {/* An operator can paste a full URL here, so this may leave the site.
          Next's Link handles both; the relative case stays a client nav. */}
      <Link className="wrap promo-inner promo-link" href={href}>
        {body}
      </Link>
    </div>
  );
}
