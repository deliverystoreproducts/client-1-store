"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ClientApiError } from "@/lib/client-api";
import { CouponWallet } from "@/components/CouponWallet";
import { formatUsd } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PublicOrderSummary, SessionState } from "@/lib/public-types";

/**
 * The account page.
 *
 * NOTE — no customer name is rendered anywhere on this screen, and there is no
 * name field. For a delivery store the useful, editable fact about a customer is
 * WHERE THINGS GO; the name is collected once at signup (the driver needs it)
 * and is not put back on a page that gets opened in public. Same rule as
 * checkout — see the header comment in CheckoutView.
 *
 * Consequence, deliberately accepted: a customer cannot self-serve a name
 * correction here any more. That is a support conversation, not a public form
 * field.
 */

function toneOf(status: string): "done" | "off" | undefined {
  const s = status.toLowerCase();
  if (s.includes("deliver") && !s.includes("out_for")) return "done";
  if (s.includes("cancel")) return "off";
  return undefined;
}

export function AccountView() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [orders, setOrders] = useState<PublicOrderSummary[] | null>(null);
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SessionState>("/api/auth/me")
      .then((s) => {
        setSession(s);
        setAddress(s.customer?.address ?? "");
        if (!s.authenticated) router.replace("/signin");
      })
      .catch(() => router.replace("/signin"));
  }, [router]);

  useEffect(() => {
    if (!session?.authenticated) return;
    apiGet<{ orders: PublicOrderSummary[] }>("/api/orders")
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]));
  }, [session?.authenticated]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const s = await apiPatch<SessionState>("/api/auth/me", { address });
      setSession(s);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "We couldn't save that.");
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    try {
      await apiPost("/api/auth/logout");
    } finally {
      window.dispatchEvent(new Event("ybs:auth-changed"));
      router.push("/");
      router.refresh();
    }
  }

  if (!session) return <p className="muted">Loading…</p>;
  if (!session.authenticated) return null;

  return (
    <>
      <div className="section-head" data-reveal style={{ "--i": 0 } as React.CSSProperties}>
        <span className="eyebrow">Account</span>
        <hr />
        <button className="btn-link" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <h1
        className="display"
        data-reveal
        style={{ fontSize: "var(--t-3)", marginBottom: "1.8rem" }}
      >
        Your orders.
      </h1>

      <div className="two-col">
        <section data-reveal style={{ "--i": 1 } as React.CSSProperties}>
          {orders === null ? <p className="muted">Loading orders…</p> : null}

          {orders?.length === 0 ? (
            <div className="empty" style={{ textAlign: "left", paddingTop: 0 }}>
              <p className="muted">
                No orders yet.{" "}
                <Link className="link" href="/">
                  Start shopping →
                </Link>
              </p>
            </div>
          ) : null}

          {orders && orders.length > 0 ? (
            <div className="ledger">
              {orders.map((o) => (
                <div className="order-row" key={o.id}>
                  <div className="stack" style={{ gap: "0.45rem" }}>
                    <div className="row" style={{ gap: "0.7rem" }}>
                      <span className="order-no">
                        {o.orderNumber ? `#${o.orderNumber}` : `Order ${o.id}`}
                      </span>
                      <span className="status-pill" data-tone={toneOf(o.status)}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="faint">{new Date(o.placedAt).toLocaleString()}</span>
                    <span className="faint">
                      {o.items
                        .slice(0, 3)
                        .map((i) => `${i.quantity}× ${i.name}`)
                        .join(", ")}
                      {o.items.length > 3 ? ` +${o.items.length - 3} more` : ""}
                    </span>
                    {o.trackingToken ? (
                      <Link
                        className="link small"
                        href={`/track/${encodeURIComponent(o.trackingToken)}`}
                      >
                        Track this order →
                      </Link>
                    ) : null}
                  </div>
                  <strong className="ledger-total">{formatUsd(o.total)}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="panel" data-reveal style={{ "--i": 2 } as React.CSSProperties}>
          <span className="eyebrow mb-2" style={{ display: "block" }}>
            Delivery details
          </span>

          {error ? (
            <div className="notice notice-error mb-2" role="alert">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="notice notice-ok mb-2" role="status">
              Saved.
            </div>
          ) : null}

          <div className="field">
            <span className="label">Verified mobile</span>
            <p className="mb-0 num">{formatPhone(session.customer?.phone)}</p>
          </div>

          <div className="field">
            <label className="label" htmlFor="acc-address">
              Default delivery address
            </label>
            <input
              id="acc-address"
              className="input"
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button className="btn btn-block" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </button>
        </aside>
      </div>

      {/* Below the fold on purpose: orders are why someone opens this page.
          The wallet renders nothing at all when there are no offers, so it
          never leaves an empty heading behind. */}
      <CouponWallet />
    </>
  );
}
