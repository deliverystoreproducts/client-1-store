import type { Metadata } from "next";
import Link from "next/link";
import { LICENSE_NUMBER, LICENSE_PLACEHOLDER } from "@/lib/site";
import { deliveryWindowNotice } from "@/lib/hours";

export const metadata: Metadata = { title: "Order placed" };
export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const pick = (key: string) => {
    const v = sp[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const orderNumber = pick("order");
  const token = pick("token");

  return (
    <div className="track-card center" data-reveal>
      <span className="eyebrow" style={{ "--i": 0 } as React.CSSProperties}>
        Confirmed
      </span>

      <h1 className="display" style={{ fontSize: "var(--t-3)", margin: "0.6rem 0 1rem" }}>
        Order placed.
      </h1>

      {orderNumber ? (
        <p className="muted">
          Your order number is <strong className="num">#{orderNumber}</strong>.
        </p>
      ) : (
        <p className="muted">We&apos;ve received your order.</p>
      )}

      <p className="muted">
        We&apos;ll text you when a driver is on the way. Please have cash and a valid ID ready at
        the door.
      </p>

      <p className="faint">{deliveryWindowNotice()}</p>

      <div className="row mt-3" style={{ justifyContent: "center" }}>
        {token ? (
          <Link className="btn" href={`/track/${encodeURIComponent(token)}`}>
            Track this order
          </Link>
        ) : null}
        <Link className="btn btn-ghost" href="/">
          Keep shopping
        </Link>
      </div>

      {/* This screen is the customer's receipt, so it carries the licensee
          identification B&P § 26151(a) requires alongside the order number. */}
      <p className="faint mt-3 mb-0">
        Sold by a licensed California cannabis retailer · License{" "}
        <span className="license" data-missing={!LICENSE_NUMBER}>
          {LICENSE_NUMBER || LICENSE_PLACEHOLDER}
        </span>
      </p>
    </div>
  );
}
