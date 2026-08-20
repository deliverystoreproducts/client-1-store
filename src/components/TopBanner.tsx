"use client";

import Link from "next/link";

/**
 * The announcement bar. One line, one action.
 *
 * DEFAULT: the standing online-order promo — a flat percentage with a code,
 * redeemed through the existing checkout promo box (which also accepts
 * /checkout?promo=CODE links). The wheel this replaced is gone: a chance
 * mechanic on a licensed product was a standing counsel question; a flat,
 * always-true discount is not. TRUTH IS OPERATOR DUTY: the code advertised
 * here must exist in the dashboard (Coupons → reusable percent coupon) —
 * an untrue discount claim is a § 26154 problem. A custom campaign
 * (NEXT_PUBLIC_ANNOUNCEMENT + _HREF) overrides; "off" hides the bar.
 */
const PROMO_CODE = process.env.NEXT_PUBLIC_PROMO_CODE || "WEB10";

export function TopBanner() {
  const text = (process.env.NEXT_PUBLIC_ANNOUNCEMENT || "").trim();
  const href = (process.env.NEXT_PUBLIC_ANNOUNCEMENT_HREF || "").trim();
  if (text === "off") return null;

  return (
    <Link href={text ? href || "/#catalogue" : "/#catalogue"} className="topbar">
      <span className="topbar-badge">YB</span>
      <span className="topbar-track">
        <span className="topbar-text">
          {text || `10% off every online order — code ${PROMO_CODE} at checkout`}
        </span>
      </span>
      <span aria-hidden>→</span>
    </Link>
  );
}
