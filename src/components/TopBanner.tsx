"use client";

import Link from "next/link";

/**
 * The announcement bar. One line, one action.
 *
 * DEFAULT: the standing online-order promo, DRIVEN BY THE COUPON ITSELF — the
 * layout looks the code up upstream (lib/store.ts getBannerPromo) and passes
 * the coupon's real terms down, so the bar can only ever advertise a discount
 * that exists and is still redeemable. No coupon → no bar; the coupon's value
 * changes → the bar follows. An untrue discount claim is a § 26154 problem,
 * and this makes one structurally impossible. Redemption is the checkout
 * promo box (which also accepts /checkout?promo=CODE links).
 *
 * A custom campaign (NEXT_PUBLIC_ANNOUNCEMENT + _HREF) overrides the promo —
 * its truth stays the operator's job; "off" hides the bar entirely.
 */
export function TopBanner({ promo }: { promo: { code: string; label: string } | null }) {
  const text = (process.env.NEXT_PUBLIC_ANNOUNCEMENT || "").trim();
  const href = (process.env.NEXT_PUBLIC_ANNOUNCEMENT_HREF || "").trim();
  if (text === "off") return null;

  const line = text || (promo ? `${promo.label} — code ${promo.code} at checkout` : "");
  if (!line) return null;

  return (
    <Link href={text ? href || "/#catalogue" : "/#catalogue"} className="topbar">
      <span className="topbar-badge">YB</span>
      <span className="topbar-track">
        <span className="topbar-text">{line}</span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
