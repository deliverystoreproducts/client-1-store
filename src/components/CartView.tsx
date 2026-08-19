"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { apiPost, ClientApiError } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import type { PricedCart } from "@/lib/public-types";

/**
 * The cart, laid out as a ledger.
 *
 * Every number on this screen comes from the server. The browser sends ids and
 * quantities to /api/cart/price and renders what comes back; it never multiplies
 * a price it stored earlier. That is what keeps the cart honest when the catalog
 * changes underneath a session that has been open for two days.
 */
export function CartView() {
  const { items, ready, setQuantity, remove } = useCart();
  const [cart, setCart] = useState<PricedCart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const price = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const priced = await apiPost<PricedCart>("/api/cart/price", { items }, signal);
      setCart(priced);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof ClientApiError ? e.message : "We couldn't price your cart.");
    } finally {
      setLoading(false);
    }
    // `items` is the only input; re-price whenever it changes.
  }, [items]);

  useEffect(() => {
    if (!ready) return;
    if (items.length === 0) {
      setCart(null);
      return;
    }
    const ctrl = new AbortController();
    void price(ctrl.signal);
    return () => ctrl.abort();
  }, [ready, items, price]);

  // Drop lines the catalog no longer resolves, so the cart cannot silently carry
  // a product that checkout will refuse.
  useEffect(() => {
    if (!cart?.unavailableProductIds.length) return;
    for (const id of cart.unavailableProductIds) remove(id);
  }, [cart, remove]);

  if (!ready) return <p className="muted">Loading your cart…</p>;

  if (items.length === 0) {
    return (
      <div className="empty" data-reveal>
        <h1>Your cart is empty</h1>
        <p className="muted mb-2">Browse the shelf and add something you like.</p>
        <Link className="btn" href="/">
          Start shopping
        </Link>
      </div>
    );
  }

  const count = (cart?.lines ?? []).reduce((n, l) => n + l.quantity, 0);

  return (
    <>
      <div className="section-head" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
        <span className="eyebrow">Your cart</span>
        <hr />
        <span className="faint num">
          {count} item{count === 1 ? "" : "s"}
        </span>
      </div>

      <h1 className="display" style={{ fontSize: "var(--t-3)", marginBottom: "1.6rem" }} data-reveal>
        Ready when you are.
      </h1>

      {error ? (
        <div className="notice notice-error mb-2" role="alert">
          {error}
        </div>
      ) : null}

      <div className="two-col">
        <div className="ledger" data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {(cart?.lines ?? []).map((line) => (
            <div className="ledger-row" key={line.productId}>
              <Link href={`/product/${line.productId}`} className="ledger-thumb">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt={line.name} />
                ) : (
                  <span aria-hidden>—</span>
                )}
              </Link>

              <div className="stack" style={{ gap: "0.55rem" }}>
                <Link href={`/product/${line.productId}`} className="ledger-name">
                  {line.name}
                </Link>
                <span className="faint num">{formatUsd(line.unitPrice)} each</span>
                <div className="row" style={{ gap: "0.9rem" }}>
                  <span className="qty">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      aria-label={`Decrease quantity of ${line.name}`}
                    >
                      −
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                      aria-label={`Increase quantity of ${line.name}`}
                    >
                      +
                    </button>
                  </span>
                  <button className="btn-link" onClick={() => remove(line.productId)}>
                    Remove
                  </button>
                </div>
              </div>

              <strong className="ledger-total">{formatUsd(line.lineTotal)}</strong>
            </div>
          ))}
          {loading && !cart ? (
            <p className="muted" style={{ paddingTop: "1.2rem" }}>
              Checking today&apos;s prices…
            </p>
          ) : null}
        </div>

        <aside className="panel" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
          <span className="eyebrow mb-2" style={{ display: "block" }}>
            Summary
          </span>

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
              <span>Estimated total</span>
              <span>{formatUsd(cart?.estimatedTotal ?? 0)}</span>
            </div>
          </div>

          <Link className="btn btn-block mt-2" href="/checkout">
            Checkout
          </Link>

          <p className="faint mt-2 mb-0">
            Final total is confirmed at checkout — store-wide deals and delivery minimums are
            applied there. Pay cash when your order arrives.
          </p>
        </aside>
      </div>
    </>
  );
}
