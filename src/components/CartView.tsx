"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { apiPost, ClientApiError } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import type { PricedCart } from "@/lib/public-types";

/**
 * The cart.
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
      <div className="empty">
        <h1>Your cart is empty</h1>
        <p>Browse the shop and add something you like.</p>
        <Link className="btn" href="/">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1>Your cart</h1>
      {error ? (
        <div className="notice notice-error" style={{ marginBottom: 18 }}>
          {error}
        </div>
      ) : null}

      <div className="two-col">
        <div>
          {(cart?.lines ?? []).map((line) => (
            <div className="line" key={line.productId}>
              <Link href={`/product/${line.productId}`} className="thumb">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.image} alt={line.name} />
                ) : (
                  <span className="thumb-placeholder" style={{ fontSize: "0.6rem" }}>
                    —
                  </span>
                )}
              </Link>
              <div className="stack" style={{ gap: 6 }}>
                <Link href={`/product/${line.productId}`}>{line.name}</Link>
                <span className="faint">{formatUsd(line.unitPrice)} each</span>
                <div className="row" style={{ gap: 10 }}>
                  <span className="qty">
                    <button
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                      aria-label={`Decrease quantity of ${line.name}`}
                    >
                      −
                    </button>
                    <span>{line.quantity}</span>
                    <button
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
              <strong>{formatUsd(line.lineTotal)}</strong>
            </div>
          ))}
          {loading && !cart ? <p className="muted">Checking today&apos;s prices…</p> : null}
        </div>

        <aside className="card">
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

          <p className="faint" style={{ marginTop: 14 }}>
            Final total is confirmed at checkout. Store-wide deals and delivery minimums are
            applied there.
          </p>

          <Link className="btn btn-block" href="/checkout" style={{ marginTop: 8 }}>
            Checkout
          </Link>
          <p className="faint center" style={{ marginTop: 12, marginBottom: 0 }}>
            Pay cash when your order arrives.
          </p>
        </aside>
      </div>
    </>
  );
}
