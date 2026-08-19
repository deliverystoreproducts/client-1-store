"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { SignInFlow } from "@/components/SignInFlow";
import { apiGet, apiPost, ClientApiError } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PricedCart, PublicCustomer, SessionState } from "@/lib/public-types";

/**
 * Checkout.
 *
 * There is no payment step: this store is cash on delivery and the driver app
 * settles at the door. So checkout's only jobs are (a) make sure we know who is
 * ordering and where it goes, and (b) hand a clean order to the backend.
 *
 * Note that the customer's NAME and PHONE are not sent. The backend reads them
 * from the record behind the session and ignores anything a body claims, so
 * there is nothing to be gained by putting them on the wire.
 */
export function CheckoutView({ requireIdPhoto }: { requireIdPhoto: boolean }) {
  const router = useRouter();
  const { items, ready, clear } = useCart();

  const [session, setSession] = useState<SessionState | null>(null);
  const [cart, setCart] = useState<PricedCart | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const s = await apiGet<SessionState>("/api/auth/me");
      setSession(s);
      if (s.customer?.address) setAddress((prev) => prev || s.customer!.address!);
    } catch {
      setSession({ authenticated: false, pendingRegistration: false, customer: null });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const priceCart = useCallback(
    async (code: string) => {
      if (items.length === 0) {
        setCart(null);
        return;
      }
      try {
        setCart(
          await apiPost<PricedCart>("/api/cart/price", {
            items,
            couponCode: code || null,
          }),
        );
      } catch {
        setCart(null);
      }
    },
    [items],
  );

  useEffect(() => {
    if (!ready) return;
    void priceCart(appliedCoupon);
  }, [ready, priceCart, appliedCoupon, session?.authenticated]);

  function onSignedIn(customer: PublicCustomer | null) {
    if (customer?.address) setAddress((prev) => prev || customer.address!);
    void loadSession();
  }

  async function placeOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiPost<{
        orderId: number;
        orderNumber: string | null;
        trackingToken: string | null;
      }>("/api/checkout", {
        items,
        address,
        notes,
        couponCode: appliedCoupon || null,
        saveAddress,
      });
      clear();
      const qs = new URLSearchParams();
      if (res.orderNumber) qs.set("order", res.orderNumber);
      if (res.trackingToken) qs.set("token", res.trackingToken);
      router.push(`/checkout/confirmation?${qs.toString()}`);
    } catch (e) {
      if (e instanceof ClientApiError && (e.code === "not_authenticated" || e.code === "profile_required")) {
        void loadSession();
      }
      setError(e instanceof ClientApiError ? e.message : "We couldn't place your order.");
      setSubmitting(false);
    }
  }

  if (!ready || session === null) return <p className="muted">Loading checkout…</p>;

  if (items.length === 0) {
    return (
      <div className="empty">
        <h1>Nothing to check out</h1>
        <p>Your cart is empty.</p>
        <Link className="btn" href="/">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <>
        <h1>Sign in to check out</h1>
        <p className="muted" style={{ maxWidth: "52ch" }}>
          We verify your number by text so the driver can reach you. Payment is cash on delivery —
          nothing is charged online.
        </p>
        <SignInFlow
          onSignedIn={onSignedIn}
          requireIdPhoto={requireIdPhoto}
          initialStep={session.pendingRegistration ? "profile" : "phone"}
        />
      </>
    );
  }

  const canSubmit = address.trim().length >= 6 && !submitting && (cart?.lines.length ?? 0) > 0;

  return (
    <>
      <h1>Checkout</h1>

      {error ? (
        <div className="notice notice-error" style={{ marginBottom: 18 }}>
          {error}
        </div>
      ) : null}

      <div className="two-col">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) void placeOrder();
          }}
        >
          <h2 style={{ fontSize: "1.1rem" }}>Delivery details</h2>

          <div className="field">
            <span className="label">Ordering as</span>
            <p style={{ margin: 0 }}>
              {session.customer?.name || "You"}{" "}
              <span className="faint">{formatPhone(session.customer?.phone)}</span>
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="address">
              Delivery address
            </label>
            <input
              id="address"
              className="input"
              autoComplete="street-address"
              placeholder="123 Main St, Apt 4, City, State ZIP"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="notes">
              Delivery notes <span className="faint">(optional)</span>
            </label>
            <textarea
              id="notes"
              className="textarea"
              placeholder="Gate code, buzzer, where to meet…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="row small" style={{ gap: 8, marginBottom: 18 }}>
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            Save this address for next time
          </label>

          <div className="notice" style={{ marginBottom: 18 }}>
            <strong>Cash on delivery.</strong> Nothing is charged now — pay the driver when your
            order arrives. Please have a valid ID ready.
          </div>

          <button className="btn btn-block" disabled={!canSubmit}>
            {submitting ? "Placing your order…" : "Place order"}
          </button>
        </form>

        <aside className="card">
          <h2 style={{ fontSize: "1.1rem" }}>Order summary</h2>
          <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
            {(cart?.lines ?? []).map((l) => (
              <div className="spread small" key={l.productId} style={{ gap: 8 }}>
                <span className="muted">
                  {l.quantity} × {l.name}
                </span>
                <span>{formatUsd(l.lineTotal)}</span>
              </div>
            ))}
          </div>

          <div className="field">
            <label className="label" htmlFor="coupon">
              Promo code
            </label>
            <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
              <input
                id="coupon"
                className="input"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Optional"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAppliedCoupon(coupon.trim())}
              >
                Apply
              </button>
            </div>
            {cart?.couponMessage ? (
              <p className="faint" style={{ marginTop: 6, marginBottom: 0 }}>
                {cart.couponMessage}
              </p>
            ) : null}
          </div>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{formatUsd(cart?.subtotal ?? 0)}</span>
            </div>
            {cart && cart.discount > 0 ? (
              <div>
                <span>Discount</span>
                <span>−{formatUsd(cart.discount)}</span>
              </div>
            ) : null}
            {cart && cart.taxes.total > 0 ? (
              <div>
                <span>Estimated tax</span>
                <span>{formatUsd(cart.taxes.total)}</span>
              </div>
            ) : null}
            <div className="grand">
              <span>Due on delivery</span>
              <span>{formatUsd(cart?.estimatedTotal ?? 0)}</span>
            </div>
          </div>
          <p className="faint" style={{ marginTop: 12, marginBottom: 0 }}>
            Store-wide deals and any delivery minimum are applied when the order is confirmed, so
            the final amount can be lower than this estimate.
          </p>
        </aside>
      </div>
    </>
  );
}
