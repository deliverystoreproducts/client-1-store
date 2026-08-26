"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/client-api";
import type { PublicCoupon } from "@/lib/public-types";

/**
 * "Your offers" — the coupons this customer can actually use.
 *
 * The shop has been minting these (quiz rewards, referrals, the 4/20 promo) with
 * nowhere for a customer to see them. A coupon nobody can find is a discount the
 * shop paid for and did not get credit for.
 *
 * The list comes from /api/coupons, which takes the phone from the VERIFIED
 * SESSION — never from anything this component sends. There is deliberately no
 * phone parameter to pass; see that route's header for why that matters.
 *
 * Copy-to-clipboard is a convenience with a visible fallback: the code is
 * selectable text either way, so a browser that blocks the clipboard API (or a
 * page not in a secure context) costs the customer nothing.
 */

interface WalletResponse {
  coupons: PublicCoupon[];
  autoPromo: PublicCoupon | null;
}

function describe(c: PublicCoupon): string {
  const v = Number(c.value) || 0;
  switch (c.type) {
    case "percent":
      return `${v}% off`;
    case "fixed":
      return `$${v} off`;
    case "delivery":
      return "Free delivery";
    default:
      return "Offer";
  }
}

/** "Expires in 3 days" while that is actionable; a plain date once it is not. */
function expiry(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  if (days <= 14) return `Expires in ${days} days`;
  return `Expires ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function CouponRow({ coupon }: { coupon: PublicCoupon }) {
  const [copied, setCopied] = useState(false);
  const ends = expiry(coupon.expiresAt);

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // No clipboard permission, or an insecure context. The code is right
      // there as selectable text — nothing to recover from and nothing to say.
    }
  }

  return (
    <li className="coupon" data-auto={coupon.autoApplied || undefined}>
      <div className="coupon-main">
        <span className="coupon-value">{describe(coupon)}</span>
        <span className="coupon-label small">{coupon.label}</span>
      </div>

      <div className="coupon-side">
        {coupon.autoApplied ? (
          <span className="tag tag-pick">Applied automatically</span>
        ) : (
          <button className="coupon-code" type="button" onClick={copy}>
            <code>{coupon.code}</code>
            <span className="coupon-copy small">{copied ? "Copied" : "Copy"}</span>
          </button>
        )}
        {ends ? <span className="coupon-exp small">{ends}</span> : null}
      </div>

      {coupon.targeted ? (
        <p className="coupon-note small muted">
          Applies to selected items — the discount shows at checkout if your basket qualifies.
        </p>
      ) : null}
    </li>
  );
}

export function CouponWallet() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiGet<WalletResponse>("/api/coupons")
      .then(setWallet)
      .catch(() => setFailed(true));
  }, []);

  // A wallet that cannot load must not take the account page down with it, and
  // must not claim the customer has no offers. Render nothing.
  if (failed) return null;
  if (!wallet) return null;

  const all = [...(wallet.autoPromo ? [wallet.autoPromo] : []), ...wallet.coupons];
  if (all.length === 0) return null;

  return (
    <section className="mt-4" aria-labelledby="offers-head">
      <div className="section-head">
        <span className="eyebrow" id="offers-head">
          Your offers
        </span>
        <hr />
        <span className="faint num">{all.length}</span>
      </div>
      <ul className="coupon-list">
        {all.map((c) => (
          <CouponRow key={c.code} coupon={c} />
        ))}
      </ul>
    </section>
  );
}
