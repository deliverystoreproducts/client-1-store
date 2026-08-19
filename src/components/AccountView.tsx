"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost, ClientApiError } from "@/lib/client-api";
import { formatUsd } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PublicOrderSummary, SessionState } from "@/lib/public-types";

export function AccountView() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [orders, setOrders] = useState<PublicOrderSummary[] | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SessionState>("/api/auth/me")
      .then((s) => {
        setSession(s);
        setName(s.customer?.name ?? "");
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
      const s = await apiPatch<SessionState>("/api/auth/me", { name, address });
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
      router.push("/");
      router.refresh();
    }
  }

  if (!session) return <p className="muted">Loading…</p>;
  if (!session.authenticated) return null;

  return (
    <>
      <div className="spread">
        <h1>Your account</h1>
        <button className="btn btn-ghost btn-sm" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      <div className="two-col" style={{ marginTop: 16 }}>
        <section>
          <h2 style={{ fontSize: "1.1rem" }}>Order history</h2>
          {orders === null ? <p className="muted">Loading orders…</p> : null}
          {orders?.length === 0 ? (
            <p className="muted">
              No orders yet. <Link href="/">Start shopping →</Link>
            </p>
          ) : null}
          {orders?.map((o) => (
            <div className="line" key={o.id} style={{ gridTemplateColumns: "1fr auto" }}>
              <div className="stack" style={{ gap: 4 }}>
                <div className="row" style={{ gap: 10 }}>
                  <strong>{o.orderNumber ? `#${o.orderNumber}` : `Order ${o.id}`}</strong>
                  <span className="status-pill">{o.status.replace(/_/g, " ")}</span>
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
                  <Link className="small" href={`/track/${encodeURIComponent(o.trackingToken)}`}>
                    Track this order →
                  </Link>
                ) : null}
              </div>
              <strong>{formatUsd(o.total)}</strong>
            </div>
          ))}
        </section>

        <aside className="card">
          <h2 style={{ fontSize: "1.1rem" }}>Your details</h2>
          {error ? (
            <div className="notice notice-error" style={{ marginBottom: 12 }}>
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="notice notice-ok" style={{ marginBottom: 12 }}>
              Saved.
            </div>
          ) : null}
          <div className="field">
            <span className="label">Mobile</span>
            <p style={{ margin: 0 }}>{formatPhone(session.customer?.phone)}</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-name">
              Name
            </label>
            <input
              id="acc-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="acc-address">
              Default delivery address
            </label>
            <input
              id="acc-address"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <button className="btn btn-block" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </aside>
      </div>
    </>
  );
}
