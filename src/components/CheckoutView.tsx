"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BasketComplianceNotices } from "@/components/ComplianceNotices";
import { useCart } from "@/components/CartProvider";
import { AddressField } from "@/components/AddressField";
import { DailyLimitReadout } from "@/components/DailyLimitReadout";
import { SignInFlow } from "@/components/SignInFlow";
import { IdScanner } from "@/components/IdScanner";
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
  // Held only for the life of this page. Cleared by the redirect to the
  // confirmation screen, so the next order scans again — which is the point.
  const [idImages, setIdImages] = useState<{ front: File; back: File } | null>(null);
  /**
   * Checkout is three steps: where it goes, who is receiving it, then what is
   * being bought. One long scroll put the ID scanner between the delivery
   * notices and the place-order button, where it read as one more disclosure to
   * skim past rather than a thing to stop and do. Splitting it also means the
   * camera is not mounted until it is actually needed.
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
      // Multipart, because the ID photographs ride along with the order and are
      // checked in the same request that places it — see /api/checkout.
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
      if (idImages) {
        form.set("idFront", idImages.front);
        form.set("idBack", idImages.back);
      }
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

  const canSubmit =
    addressReady && !submitting && (cart?.lines.length ?? 0) > 0 && !overLimit && !!idImages;

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
              if (addressReady) setStep(2);
            } else if (step === 3 && canSubmit) {
              void placeOrder();
            }
          }}
        >
          <ol className="steps" aria-label="Checkout progress">
            {(["Delivery", "ID check", "Review"] as const).map((label, i) => (
              <li
                key={label}
                className="steps-item"
                data-state={step === i + 1 ? "current" : step > i + 1 ? "done" : "todo"}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span className="steps-num">{step > i + 1 ? "✓" : i + 1}</span>
                {label}
              </li>
            ))}
          </ol>

          {step === 1 ? (
            <>
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

              {/* 4 CCR §§ 15404 / 15415(g): the delivery employee verifies identity
              and age IN PERSON before handing anything over, and § 15415(c)
              forbids an unstaffed delivery. The website is not the compliance
              boundary for age — the driver is — so checkout must never leave a
              customer expecting otherwise. */}
              <div className="notice mb-2">
                <strong>ID is checked at the door.</strong> The driver has to see a valid,
                unexpired, government-issued photo ID and cannot complete the delivery without it.
                Someone {minAge} or older must be there to receive the order in person — we cannot
                leave cannabis at a door, with a neighbour, or in a locker.
              </div>

              <button
                type="button"
                className="btn btn-block"
                disabled={!addressReady}
                onClick={() => setStep(2)}
              >
                {addressReady ? "Next — check your ID" : "Enter a delivery address"}
              </button>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2>ID check</h2>
              {/* EVERY order, not just the first. Cannabis is handed over
                  against a valid ID at the door; asking once at signup and
                  trusting forever after is not an ID check. */}
              <p className="faint mt-0 mb-2">
                Required on every order. Scan the front and back of your government ID — we read the
                barcode on the back to confirm your age. Your driver checks the physical card at the
                door as well.
              </p>
              <IdScanner onChange={setIdImages} disabled={submitting} />

              <button
                type="button"
                className="btn btn-block mt-2"
                disabled={!idImages}
                onClick={() => setStep(3)}
              >
                {idImages ? "Next — review your order" : "Scan both sides to continue"}
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

              {cart ? <DailyLimitReadout assessment={cart.dailyLimit} className="mb-2" /> : null}

              {/* 27 CCR § 25602(b)(1)(C) and B&P § 26152.1, on the last screen
              before the order is placed. Plain styling, deliberately — this
              page is a form, and the warnings read as statements rather than as
              design. */}
              <BasketComplianceNotices
                routes={routes}
                vapeHardware={vapeHardware}
                className="basket-warnings"
              />

              {/* ── SB 540 safer-use brochure — B&P § 26070.3(b) ────────────────
              "On and after March 1, 2025, a retailer … shall prominently
              display the brochure, including printed copies, at the point of
              sale or final delivery in person AND ONLINE AT TIME OF ONLINE
              PURCHASES, and offer each new consumer a copy … at the time of
              first purchase or delivery."

              This is the most commonly missed website obligation in California
              cannabis retail, because it lives in the statute and is mirrored
              nowhere in the DCC regulations — a regulations-only review never
              sees it.

              Placement is the whole point: immediately above the place-order
              control, not behind an accordion and not in the footer.
              "Prominently" and "at time of … purchase" both point here.

              ⚠️ Served from THIS origin, never hot-linked from the DCC's CDN —
              the site makes no third-party browser request and the brochure is
              not the exception. And ⚠️ the STATUTE ALSO REQUIRES PRINTED COPIES
              at final delivery; that is a driver-runbook task no website can
              discharge. */}
              {brochureUrl ? (
                <div className="notice mb-2">
                  <strong>Before you order: California&apos;s safer-use guide.</strong> The
                  Department of Cannabis Control publishes a short guide to the effects of cannabis,
                  high-potency products, mental health, and use while pregnant or breastfeeding.
                  Please read it — you are also given a printed copy at delivery.
                  <p className="mt-1 mb-0">
                    <a
                      className="link"
                      href={brochureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open the DCC safer-use guide (PDF)
                    </a>
                  </p>
                </div>
              ) : (
                <div className="notice notice-error mb-2" role="alert">
                  <strong>SET NEXT_PUBLIC_SAFER_USE_BROCHURE_URL.</strong> B&amp;P § 26070.3(b) has
                  required this store to display the DCC safer-use brochure online at the time of
                  purchase since 1 March 2025. Host the current PDF on this origin and set the
                  variable. This store is not launch-ready until you do.
                </div>
              )}

              <div className="notice mb-2">
                <strong>ID ready.</strong> Both sides captured — we&apos;ll check them as your order
                is placed.
              </div>

              <button className="btn btn-block" disabled={!canSubmit}>
                {submitting ? "Checking your ID…" : "Place order"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block mt-1"
                disabled={submitting}
                onClick={() => setStep(2)}
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

          {/* Say it plainly. A discount that appears in the total with no
              explanation reads as a pricing error, and a customer who cannot
              see WHY the number moved does not trust the number. */}
          {autoPromoCode && appliedCoupon === autoPromoCode && cart && cart.discount > 0 ? (
            <div className="notice notice-ok mb-2" role="status">
              <strong>{autoPromoLabel || "Store discount"}</strong> — applied automatically with
              code <code>{autoPromoCode}</code>. Nothing to enter.
            </div>
          ) : null}

          <div className="field">
            <label className="label" htmlFor="coupon">
              {autoPromoCode ? "Have a different code?" : "Promo code"}
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
            {cart?.couponMessage ? <p className="faint mt-1 mb-0">{cart.couponMessage}</p> : null}
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
