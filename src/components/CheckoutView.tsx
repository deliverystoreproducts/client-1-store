"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { SignInFlow } from "@/components/SignInFlow";
import { apiGet, apiPost, ClientApiError } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import type {
  PricedCart,
  PublicCustomer,
  PublicOrderSummary,
  PublicTracking,
  SessionState,
} from "@/lib/public-types";

/**
 * Checkout. DELIBERATELY PLAIN — see the `.plain` block in globals.css.
 *
 * Same type, same palette, none of the art direction. This screen is a form, and
 * a form's job is to be unambiguous on a phone, one-handed, in a hurry: big
 * targets, high contrast, one column of thought, nothing decorative competing
 * for attention next to the fields. That is the owner's explicit call. Do not
 * dress it up.
 *
 * There is no payment step: this store is cash on delivery and the driver
 * settles at the door. So checkout's only jobs are (a) make sure we know where
 * it goes, and (b) hand a clean order to the backend.
 *
 * Note what is NOT sent and NOT shown. The customer's name and phone are never
 * put on the wire (the backend reads them from the record behind the session and
 * ignores anything a body claims) and the NAME IS NEVER RENDERED. This screen
 * gets opened in public — on a bus, at a counter, over someone's shoulder — and
 * the useful confirmation is "is this going to the right place", not "who am I".
 * The readout is an ADDRESS, never a person. See `resolveLastAddress`.
 */
export function CheckoutView({
  requireIdPhoto,
  deliveryNotice,
  withinDeliveryWindow,
}: {
  requireIdPhoto: boolean;
  /** One plain sentence about 4 CCR § 15403 delivery hours, computed server-side. */
  deliveryNotice: string;
  withinDeliveryWindow: boolean;
}) {
  const router = useRouter();
  const { items, ready, clear } = useCart();

  const [session, setSession] = useState<SessionState | null>(null);
  const [cart, setCart] = useState<PricedCart | null>(null);
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);
  const [lastAddress, setLastAddress] = useState<string | null>(null);
  const [lastAddressSource, setLastAddressSource] = useState<"order" | "saved" | null>(null);
  const [lookingUp, setLookingUp] = useState(true);
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      setSession(await apiGet<SessionState>("/api/auth/me"));
    } catch {
      setSession({ authenticated: false, pendingRegistration: false, customer: null });
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  // ── where did this customer's last order actually go? ──────────────────
  //
  // Both halves of this come from BFF routes that already exist. The order-list
  // payload deliberately carries no address (upstream's /orders handler selects
  // id/sNo/status/price/... and nothing else), but every order carries its own
  // tracking capability and THAT payload does carry the delivery address. So the
  // most recent order that has a token is where "last delivered to" lives.
  //
  // Failure is not an error state here: no history, an unreadable history and a
  // token that no longer resolves all land on the same neutral prompt.
  const savedAddress = session?.customer?.address ?? null;
  useEffect(() => {
    if (!session?.authenticated) return;
    let cancelled = false;

    (async () => {
      setLookingUp(true);
      try {
        const { orders } = await apiGet<{ orders: PublicOrderSummary[] }>("/api/orders?limit=5");
        // Newest first, upstream-ordered by createdAt desc.
        for (const order of orders.slice(0, 3)) {
          if (cancelled) return;
          if (!order.trackingToken) continue;
          try {
            const tracking = await apiGet<PublicTracking>(
              `/api/orders/track/${encodeURIComponent(order.trackingToken)}`,
            );
            const found = tracking.address?.trim();
            if (found) {
              if (cancelled) return;
              setLastAddress(found);
              setLastAddressSource("order");
              setLookingUp(false);
              return;
            }
          } catch {
            /* that token no longer resolves — try the one before it */
          }
        }
      } catch {
        /* no readable history; the saved address or the prompt covers it */
      }

      if (cancelled) return;
      const saved = savedAddress?.trim();
      if (saved) {
        setLastAddress(saved);
        setLastAddressSource("saved");
      }
      setLookingUp(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.authenticated, savedAddress]);

  // Prefill from whatever we resolved, but never fight someone who is typing.
  useEffect(() => {
    if (!lastAddress || addressTouched) return;
    setAddress(lastAddress);
  }, [lastAddress, addressTouched]);

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

  function onSignedIn(_customer: PublicCustomer | null) {
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
      if (
        e instanceof ClientApiError &&
        (e.code === "not_authenticated" || e.code === "profile_required")
      ) {
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
        <p className="muted mb-2">Your cart is empty.</p>
        <Link className="btn" href="/">
          Browse the shop
        </Link>
      </div>
    );
  }

  if (!session.authenticated) {
    return (
      <div className="plain">
        <h1>Sign in to check out</h1>
        <p className="muted" style={{ maxWidth: "52ch" }}>
          We verify your number by text so the driver can reach you. Payment is cash on delivery —
          nothing is charged online.
        </p>
        <div className="mt-2">
          <SignInFlow
            onSignedIn={onSignedIn}
            requireIdPhoto={requireIdPhoto}
            initialStep={session.pendingRegistration ? "profile" : "phone"}
          />
        </div>
      </div>
    );
  }

  const canSubmit = address.trim().length >= 6 && !submitting && (cart?.lines.length ?? 0) > 0;

  return (
    <div className="plain">
      <h1>Checkout</h1>
      <p className="faint mb-0">Cash on delivery — nothing is charged online.</p>

      {error ? (
        <div className="notice notice-error mt-2" role="alert">
          {error}
        </div>
      ) : null}

      <div className="plain-grid">
        <form
          className="plain-box"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) void placeOrder();
          }}
        >
          <h2>Delivery</h2>

          {/* Where this is going — never who is ordering. */}
          <div className="field">
            <span className="label" id="deliver-to-label">
              Deliver to
            </span>
            <div className="plain-address" aria-labelledby="deliver-to-label">
              {lastAddress ? (
                <>
                  <span className="faint">
                    {lastAddressSource === "order"
                      ? "Your last order went here."
                      : "Your saved address."}{" "}
                    Change it below if it has moved.
                  </span>
                  <p>{lastAddress}</p>
                </>
              ) : lookingUp ? (
                <span className="faint">Checking for a previous delivery address…</span>
              ) : (
                <p className="muted" style={{ fontSize: "1rem" }}>
                  Enter the address you&apos;d like this delivered to.
                </p>
              )}
            </div>
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
              onChange={(e) => {
                setAddressTouched(true);
                setAddress(e.target.value);
              }}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="notes">
              Delivery notes (optional)
            </label>
            <textarea
              id="notes"
              className="textarea"
              placeholder="Gate code, buzzer, where to meet…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <label className="check mb-2">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
            />
            Save this address for next time
          </label>

          <div className="notice mb-2">
            <strong>Cash on delivery.</strong> Nothing is charged now — pay the driver when your
            order arrives. Please have a valid ID ready.
          </div>

          {/* Delivery hours are a fact the customer needs before they commit, not a
              block on the button: 4 CCR § 15403 caps DELIVERY at 06:00–22:00
              Pacific, and whether an order may be PLACED outside it is unsettled.
              So we state it, and state it louder when it currently bites. */}
          <div
            className={`notice mb-2${withinDeliveryWindow ? "" : " notice-error"}`}
            role={withinDeliveryWindow ? undefined : "status"}
          >
            {withinDeliveryWindow ? null : <strong>Outside delivery hours. </strong>}
            {deliveryNotice}
          </div>

          <button className="btn btn-block" disabled={!canSubmit}>
            {submitting ? "Placing your order…" : "Place order"}
          </button>

          <p className="faint mt-2 mb-0">
            We&apos;ll text order updates to the mobile number you verified.
          </p>
        </form>

        <aside className="plain-box">
          <h2>Order summary</h2>

          <div className="mb-2">
            {(cart?.lines ?? []).map((l) => (
              <div className="plain-summary-line" key={l.productId}>
                <span>
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
            <div className="row" style={{ gap: "0.5rem", flexWrap: "nowrap" }}>
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
              <p className="faint mt-1 mb-0">{cart.couponMessage}</p>
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

          <p className="faint mt-2 mb-0">
            Store-wide deals and any delivery minimum are applied when the order is confirmed, so
            the final amount can be lower than this estimate.
          </p>
        </aside>
      </div>
    </div>
  );
}
