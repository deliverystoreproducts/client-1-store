"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BasketComplianceNotices } from "@/components/ComplianceNotices";
import { useCart } from "@/components/CartProvider";
import { AddressField } from "@/components/AddressField";
import { DailyLimitReadout } from "@/components/DailyLimitReadout";
import { SignInFlow } from "@/components/SignInFlow";
import { apiGet, apiPost, apiPostForm, ClientApiError } from "@/lib/client-api";
import { TAX_LINE_LABELS } from "@/lib/compliance/tax";
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
  autoPromoCode = "",
  autoPromoLabel = "",
  requireIdPhoto,
  deliveryNotice,
  withinDeliveryWindow,
  brochureUrl,
  minAge,
}: {
  /**
   * The store-wide promo, already validated upstream. Applied on mount so the
   * total a customer sees is the total they get, without typing anything.
   *
   * It is a REAL coupon code, not a client-side percentage — the platform's
   * coupon engine still prices and redeems it, so the storefront never computes
   * a discount the checkout might disagree with.
   */
  autoPromoCode?: string;
  autoPromoLabel?: string;
  requireIdPhoto: boolean;
  /** One plain sentence about 4 CCR § 15403 delivery hours, computed server-side. */
  deliveryNotice: string;
  withinDeliveryWindow: boolean;
  /**
   * The DCC's SB 540 safer-use brochure, served from THIS origin. Empty string
   * when the operator has not supplied one — see the block that renders it.
   */
  brochureUrl: string;
  minAge: number;
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
  const [appliedCoupon, setAppliedCoupon] = useState(autoPromoCode);

  // Promo links arrive as /checkout?promo=CODE. Prefill AND apply — the
  // "Apply it at checkout" button must mean applied, not "now retype it"
  // (owner found the gap). window.location in a mount effect rather than
  // useSearchParams: no Suspense-boundary requirement, runs client-only.
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("promo")?.trim();
      if (code) {
        setCoupon(code);
        setAppliedCoupon(code); // the pricing effect picks this up and reprices
      }
    } catch {}
  }, []);
  const [saveAddress, setSaveAddress] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /**
   * ID photo — the ORIGINAL flow, restored 2026-08-27 at the owner's request:
   * ONE photo, asked for ONCE, SAVED to the customer's account on the platform
   * (`hasId`). A customer who already has one on file is never asked again; the
   * driver checks the physical card at the door on every order regardless.
   *
   * The two-sided "scan front and back on every order" step that replaced it
   * verified the barcode inline and then threw both photos away — nothing was
   * ever stored, so the account page said "No ID photo on file" after two
   * orders and the customer was asked again next time. Two photos per order
   * was also simply too much.
   */
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idUploading, setIdUploading] = useState(false);
  const [idError, setIdError] = useState<string | null>(null);
  /**
   * Checkout is up to three steps: where it goes, (your ID, if the store needs
   * one and you have none on file), then what is being bought.
   */
  const [step, setStep] = useState<1 | 2 | 3>(1);

  /**
   * The delivery minimum for the address being typed.
   *
   * ADVISORY ONLY. The real enforcement is server-side in POST /api/checkout,
   * which compares the SUBTOTAL (pre-tax, pre-discount) against the zone —
   * this mirrors that comparison so the two cannot say different things, but a
   * failed lookup means "no opinion", never "blocked".
   *
   * The point is purely the ORDER OF EVENTS. Without it a customer types an
   * address, photographs both sides of their licence, and learns on the last
   * step that they are $20 short. Same fact, three steps too late.
   */
  const [zone, setZone] = useState<{ city: string; minimumOrder: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      setSession(await apiGet<SessionState>("/api/auth/me"));
    } catch {
      setSession({
        authenticated: false,
        pendingRegistration: false,
        customer: null,
      });
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
      // Multipart payload kept for compatibility with /api/checkout; the ID
      // photo is saved to the account beforehand (step 2), not sent per order.
      const form = new FormData();
      form.set(
        "payload",
        JSON.stringify({
          items,
          address,
          notes,
          couponCode: appliedCoupon || null,
          saveAddress,
        }),
      );
      const res = await apiPostForm<{
        orderId: number;
        orderNumber: string | null;
        trackingToken: string | null;
      }>("/api/checkout", form);
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

  // Delivery-zone lookup for the typed address. HOOKS END HERE — every hook in
  // this component must sit above the early returns below. This effect used to
  // live further down, past `return <p>Loading…</p>`, so the first render (no
  // session yet) ran N hooks and the next ran N+1: React error #310, and the
  // checkout page crashed for every signed-in customer.
  useEffect(() => {
    const a = address.trim();
    if (a.length < 6) {
      setZone(null);
      return;
    }
    // Debounced: this fires per keystroke otherwise, and each one is an
    // upstream geocode against a customer's home address.
    let stop = false;
    const timer = window.setTimeout(() => {
      apiGet<{ zone: { city: string; minimumOrder: number } | null }>(
        `/api/delivery-zone?address=${encodeURIComponent(a)}`,
      )
        .then((r) => {
          if (!stop) setZone(r.zone);
        })
        .catch(() => {
          // No opinion. Checkout still enforces it.
          if (!stop) setZone(null);
        });
    }, 500);
    return () => {
      stop = true;
      window.clearTimeout(timer);
    };
  }, [address]);

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
        <div className="plain-grid">
          <div className="mt-2">
            <SignInFlow
              onSignedIn={onSignedIn}
              // Never here, whatever the store setting says: checkout scans the
              // ID unconditionally a few steps below, and asking a brand-new
              // customer to photograph both sides of their licence twice in one
              // sitting is how a signup gets abandoned. The setting still
              // governs the standalone /signin form.
              requireIdPhoto={false}
              initialStep={session.pendingRegistration ? "profile" : "phone"}
            />
          </div>
          {/* The basket stays VISIBLE while the shopper hands over their phone
              number (audit #4): asking for identity while hiding the thing
              being bought is the peak-anxiety moment of the funnel. Read-only —
              the promo box and totals-with-taxes belong to the signed-in view. */}
          {cart && cart.lines.length > 0 ? (
            <aside className="plain-box" aria-label="Order summary">
              <h2>Your order</h2>
              <div className="mb-2">
                {cart.lines.map((l) => (
                  <div className="plain-summary-line" key={l.productId}>
                    <span>
                      {l.quantity} × {l.name}
                    </span>
                    <span>{formatUsd(l.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="totals">
                <div className="grand">
                  <span>Estimated total</span>
                  <span>{formatUsd(cart.estimatedTotal)}</span>
                </div>
              </div>
              <p className="faint mt-1">Taxes shown at the next step. Cash at the door.</p>
            </aside>
          ) : null}
        </div>
      </div>
    );
  }

  // Warnings and limits were both decided on the SERVER when the cart was
  // priced; this view only groups and renders them. The daily-limit refusal is
  // enforced again in POST /api/checkout — a disabled button is a courtesy, not
  // a control.
  const routes = (cart?.lines ?? [])
    .map((l) => l.consumptionRoute)
    .filter((r): r is NonNullable<typeof r> => r != null);
  const vapeHardware = (cart?.lines ?? []).flatMap((l) => l.vapeHardware);
  const overLimit = (cart?.dailyLimit.exceeded.length ?? 0) > 0;

  const addressReady = address.trim().length >= 6;

  /**
   * Below the zone's minimum. Compared against SUBTOTAL to match the
   * server-side check exactly (checkout.ts compares pre-tax, pre-discount) —
   * comparing against the estimated total here would let a cart pass this
   * screen and be refused at the end, which is the failure this exists to
   * prevent, inverted.
   */
  const belowMinimum =
    zone != null && zone.minimumOrder > 0 && cart != null && cart.subtotal < zone.minimumOrder;
  const shortBy = belowMinimum && zone ? zone.minimumOrder - cart!.subtotal : 0;

  // The store wants an ID photo on file and this customer has none yet.
  const needsId = requireIdPhoto && !session?.customer?.hasId;
  const canSubmit =
    addressReady && !submitting && (cart?.lines.length ?? 0) > 0 && !overLimit && !needsId;

  async function saveIdPhoto() {
    if (!idFile) return;
    setIdUploading(true);
    setIdError(null);
    try {
      const form = new FormData();
      form.set("photo", idFile);
      const s = await apiPostForm<SessionState>("/api/account/id-photo", form);
      setSession(s);
      setStep(3);
    } catch (e) {
      setIdError(e instanceof ClientApiError ? e.message : "We couldn't save that photo. Please try again.");
    } finally {
      setIdUploading(false);
    }
  }

  /** Delivery → (ID) → Review. Skips the ID step when there is nothing to ask. */
  function afterDelivery() {
    setStep(needsId ? 2 : 3);
  }

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
            // Enter advances the wizard rather than doing nothing: only the
            // final step's button is a submit, but a keyboard user pressing
            // Enter in the address field expects to move on.
            if (step === 1) {
              if (addressReady) afterDelivery();
            } else if (step === 3 && canSubmit) {
              void placeOrder();
            }
          }}
        >
          <ol className="steps" aria-label="Checkout progress">
            {(needsId ? (["Delivery", "Your ID", "Review"] as const) : (["Delivery", "Review"] as const)).map(
              (label, i) => {
                // With no ID step, "Review" is step 3 internally but shows as 2.
                const n = needsId ? i + 1 : i === 0 ? 1 : 3;
                const shown = i + 1;
                return (
                  <li
                    key={label}
                    className="steps-item"
                    data-state={step === n ? "current" : step > n ? "done" : "todo"}
                    aria-current={step === n ? "step" : undefined}
                  >
                    <span className="steps-num">{step > n ? "✓" : shown}</span>
                    {label}
                  </li>
                );
              },
            )}
          </ol>

          {step === 1 ? (
            <>
              <h2>Delivery</h2>

              <div className="field">
                <label className="label" htmlFor="address">
                  Delivery address
                </label>
                <AddressField
                  id="address"
                  placeholder="123 Main St, Apt 4, City, State ZIP"
                  value={address}
                  onChange={(v) => {
                    setAddressTouched(true);
                    setAddress(v);
                  }}
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

              {/* Stated here rather than at the end. The same fact arrives from the
                  server if they proceed anyway — this only moves it to before
                  they photograph their licence. Not a block: the customer may
                  well be about to add more to the basket. */}
              {belowMinimum && zone ? (
                <div className="notice notice-error mb-2" role="status">
                  <strong>
                    Orders to {zone.city} start at {formatUsd(zone.minimumOrder)}.
                  </strong>{" "}
                  Your basket is {formatUsd(cart!.subtotal)} — {formatUsd(shortBy)} short.{" "}
                  <Link className="link" href="/products">
                    Add something else
                  </Link>{" "}
                  and come back; nothing here is lost.
                </div>
              ) : zone && zone.minimumOrder > 0 ? (
                <p className="faint mb-2">
                  Deliveries to {zone.city} have a {formatUsd(zone.minimumOrder)} minimum — your
                  basket clears it.
                </p>
              ) : null}

              {/* One line when it matters (outside delivery hours), otherwise the
                  facts fold away behind ⓘ — the customer asked for an address
                  form, not a leaflet. The rules themselves are unchanged: the
                  driver checks ID at the door (4 CCR §§ 15404/15415), cash on
                  delivery, 06:00–22:00 (§ 15403). */}
              {withinDeliveryWindow ? null : (
                <div className="notice notice-error mb-2" role="status">
                  <strong>Outside delivery hours. </strong>
                  {deliveryNotice}
                </div>
              )}
              <details className="info-fold mb-2">
                <summary>
                  <span className="info-i" aria-hidden>i</span> Delivery info
                </summary>
                <ul>
                  <li>
                    <strong>Cash on delivery</strong> — nothing is charged now; pay the driver.
                  </li>
                  <li>{deliveryNotice}</li>
                  <li>
                    <strong>ID at the door</strong> — the driver checks a valid government photo ID;
                    someone {minAge}+ must receive the order in person.
                  </li>
                </ul>
              </details>

              <button
                type="button"
                className="btn btn-block"
                disabled={!addressReady}
                onClick={afterDelivery}
              >
                {!addressReady ? "Enter a delivery address" : needsId ? "Next — your ID" : "Next — review order"}
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2>Your ID</h2>
              <p className="faint mt-0 mb-2">
                This store needs one photo of your government-issued ID on file before your first
                delivery. We ask once and keep it with your account — your driver still checks the
                physical card at the door.
              </p>

              {idError ? (
                <div className="notice notice-error mb-2" role="alert">
                  {idError}
                </div>
              ) : null}

              {idPreview ? (
                <div className="mb-2" style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--rule)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={idPreview} alt="Your ID photo" style={{ display: "block", width: "100%", maxHeight: 260, objectFit: "contain", background: "#000" }} />
                </div>
              ) : null}

              <label className="btn btn-outline btn-block" style={{ cursor: "pointer" }}>
                {idFile ? "Retake photo" : "Take a photo of your ID"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={idUploading || submitting}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setIdError(null);
                    setIdFile(f);
                    setIdPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return f ? URL.createObjectURL(f) : null;
                    });
                    e.target.value = "";
                  }}
                />
              </label>

              <button
                type="button"
                className="btn btn-block mt-2"
                disabled={!idFile || idUploading}
                onClick={() => void saveIdPhoto()}
              >
                {idUploading ? "Saving…" : idFile ? "Save and continue" : "Add a photo to continue"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block mt-1"
                onClick={() => setStep(1)}
              >
                Back to delivery
              </button>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2>Review &amp; place order</h2>

              {/* The statutory notices — Prop 65 (27 CCR § 25602), the daily
                  limit (4 CCR § 15409) and the DCC safer-use guide (B&P
                  § 26070.3(b)) — in ONE fold, its summary always visible with
                  the WARNING word and the guide link, so the notices are
                  offered at the point of purchase without being a page of
                  reading between the customer and the button. Opens by itself
                  when the daily limit is actually exceeded. */}
              <details
                className="info-fold info-fold-warn mb-2"
                open={overLimit || undefined}
              >
                <summary>
                  <span aria-hidden>⚠</span> WARNING — health &amp; legal notices
                  {brochureUrl ? (
                    <>
                      {" · "}
                      <a className="link" href={brochureUrl} target="_blank" rel="noopener noreferrer">
                        safer-use guide (PDF)
                      </a>
                    </>
                  ) : null}
                </summary>
                <div className="mt-2">
                  {cart ? <DailyLimitReadout assessment={cart.dailyLimit} className="mb-2" /> : null}
                  <BasketComplianceNotices
                    routes={routes}
                    vapeHardware={vapeHardware}
                    className="basket-warnings"
                  />
                  {brochureUrl ? (
                    <p className="faint mt-2 mb-0">
                      California&apos;s Department of Cannabis Control publishes a short safer-use
                      guide — you are also given a printed copy at delivery.
                    </p>
                  ) : (
                    <div className="notice notice-error mt-2" role="alert">
                      <strong>Safer-use brochure link not set</strong> — Settings → Storefront →
                      Legal &amp; compliance. Required online at the time of purchase (B&amp;P
                      § 26070.3(b)).
                    </div>
                  )}
                </div>
              </details>

              <button className="btn btn-block" disabled={!canSubmit}>
                {submitting ? "Placing your order…" : "Place order"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block mt-1"
                disabled={submitting}
                onClick={() => setStep(needsId ? 2 : 1)}
              >
                Back to ID check
              </button>

              <p className="faint mt-2 mb-0">
                We&apos;ll text order updates to the mobile number you verified. Transactional
                messages only — this store does not send marketing texts.
              </p>
            </>
          ) : null}
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

          {/* The automatic discount speaks for itself as a line in the totals.
              The code box is there for whoever has one, folded away for
              everyone else. */}
          <details className="info-fold mb-2" open={appliedCoupon ? true : undefined}>
            <summary>Have a promo code?</summary>
            <div className="row mt-2" style={{ gap: "0.5rem", flexWrap: "nowrap" }}>
              <label className="sr-only" htmlFor="coupon">
                Promo code
              </label>
              <input
                id="coupon"
                className="input"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Code"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setAppliedCoupon(coupon.trim())}
              >
                Apply
              </button>
            </div>
            {cart?.couponMessage ? <p className="faint mt-1 mb-0">{cart.couponMessage}</p> : null}
            {cart?.autoDiscount ? (
              <p className="faint mt-1 mb-0">
                A code replaces the automatic {cart.autoDiscount.percent}%.
              </p>
            ) : null}
          </details>

          <div className="totals">
            <div>
              <span>Subtotal</span>
              <span>{formatUsd(cart?.subtotal ?? 0)}</span>
            </div>
            {cart && cart.discount > 0 ? (
              <div>
                <span>
                  {cart.autoDiscount ? `Automatic discount (${cart.autoDiscount.percent}%)` : "Discount"}
                </span>
                <span>−{formatUsd(cart.discount)}</span>
              </div>
            ) : null}
            {/* R&TC § 34011.2(d) requires the cannabis excise tax to be
                SEPARATELY STATED — never folded into one "tax" figure. CDTFA
                warns that failing to separately state it can mean the whole
                selling price is treated as gross receipts subject to the excise
                tax, so this is a money question as well as a paperwork one.
                Order follows § 34011.2(e)–(f). */}
            {cart && cart.taxes.city > 0 ? (
              <div>
                <span>{TAX_LINE_LABELS.city}</span>
                <span>{formatUsd(cart.taxes.city)}</span>
              </div>
            ) : null}
            {cart && cart.taxes.excise > 0 ? (
              <div>
                <span>
                  {TAX_LINE_LABELS.excise}
                  {cart.exciseRatePercent != null ? ` (${cart.exciseRatePercent}%)` : ""}
                </span>
                <span>{formatUsd(cart.taxes.excise)}</span>
              </div>
            ) : null}
            {cart && cart.taxes.state > 0 ? (
              <div>
                <span>{TAX_LINE_LABELS.state}</span>
                <span>{formatUsd(cart.taxes.state)}</span>
              </div>
            ) : null}
            <div className="grand">
              <span>Due on delivery</span>
              <span>{formatUsd(cart?.estimatedTotal ?? 0)}</span>
            </div>
          </div>

          <p className="faint mt-2 mb-0">
            Store-wide deals and any delivery minimum are applied when the order is confirmed, so
            the final amount can be lower than this estimate. The itemised receipt you get at the
            door states the California cannabis excise tax separately, as required by R&amp;TC §
            34011.2(d).
          </p>
        </aside>
      </div>
    </div>
  );
}
