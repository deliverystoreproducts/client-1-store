import type { Metadata } from "next";
import Link from "next/link";

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
    <div className="card" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1>Order placed</h1>
      {orderNumber ? (
        <p className="muted">
          Your order number is <strong>#{orderNumber}</strong>.
        </p>
      ) : (
        <p className="muted">We&apos;ve received your order.</p>
      )}
      <p className="muted">
        We&apos;ll text you when a driver is on the way. Please have cash and a valid ID ready at
        the door.
      </p>
      <div className="row" style={{ justifyContent: "center", marginTop: 22 }}>
        {token ? (
          <Link className="btn" href={`/track/${encodeURIComponent(token)}`}>
            Track this order
          </Link>
        ) : null}
        <Link className="btn btn-ghost" href="/">
          Keep shopping
        </Link>
      </div>
    </div>
  );
}
