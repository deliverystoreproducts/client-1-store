"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiGet, apiPatch, apiPost, apiPostForm, ClientApiError } from "@/lib/client-api";
import { CouponWallet } from "@/components/CouponWallet";
import { formatUsd } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { PublicOrderSummary, SessionState } from "@/lib/public-types";

/**
 * The account page — the reference storefront's layout, top to bottom:
 *
 *   My Account
 *   ┌ Profile ──────────── Edit ┐   name · phone · address
 *   ┌ ID Photo ────────────────┐   on file ✓ / upload
 *   ┌ Order History ───────────┐
 *   (coupon wallet, when there is anything in it)
 *
 * WHY THIS ORDER. The thing a customer opens this page to CHANGE is at the
 * top and takes one tap; the thing they open it to CHECK (orders) is below and
 * as long as it needs to be. The previous layout inverted that — orders first,
 * the address form after the last order, and no ID upload at all — which on a
 * phone meant "where do I change my address?" was answered by scrolling past
 * every order ever placed.
 *
 * Loading rule: the customer is sent to /signin ONLY when the server says
 * "not signed in". A failed request (upstream hiccup, offline) shows a retry
 * instead — bouncing a just-verified customer back to the sign-in form on a
 * transient error is the bug this replaces.
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [orders, setOrders] = useState<PublicOrderSummary[] | null>(null);

  // profile editing
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  // id photo
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [idMsg, setIdMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function loadSession() {
    setLoadFailed(false);
    apiGet<SessionState>("/api/auth/me")
      .then((s) => {
        setSession(s);
        setName(s.customer?.name ?? "");
        setAddress(s.customer?.address ?? "");
        if (!s.authenticated) router.replace("/signin");
      })
      .catch(() => setLoadFailed(true));
  }

  useEffect(loadSession, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session?.authenticated) return;
    apiGet<{ orders: PublicOrderSummary[] }>("/api/orders")
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]));
  }, [session?.authenticated]);

  async function saveProfile() {
    setSaving(true);
    setProfileMsg(null);
    try {
      const s = await apiPatch<SessionState>("/api/auth/me", { name, address });
      setSession(s);
      setEditing(false);
      setProfileMsg({ kind: "ok", text: "Saved." });
    } catch (e) {
      setProfileMsg({
        kind: "error",
        text: e instanceof ClientApiError ? e.message : "We couldn't save that.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function uploadId(file: File) {
    setUploading(true);
    setIdMsg(null);
    try {
      const form = new FormData();
      form.set("photo", file);
      const s = await apiPostForm<SessionState>("/api/account/id-photo", form);
      setSession(s);
      setIdMsg({ kind: "ok", text: "ID photo saved. Your driver still checks the card at the door." });
    } catch (e) {
      setIdMsg({
        kind: "error",
        text: e instanceof ClientApiError ? e.message : "We couldn't save that photo.",
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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

  if (loadFailed) {
    return (
      <div className="acct">
        <h1 className="acct-title">My Account</h1>
        <div className="notice notice-error mb-2" role="alert">
          We couldn&apos;t load your account just now.
        </div>
        <button className="btn btn-outline" onClick={loadSession}>
          Try again
        </button>
      </div>
    );
  }
  if (!session) return <p className="muted">Loading…</p>;
  if (!session.authenticated) return null;

  const c = session.customer;

  return (
    <div className="acct">
      <div className="acct-head">
        <h1 className="acct-title">My Account</h1>
        <button className="btn-link" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <section className="panel acct-card" aria-labelledby="profile-head">
        <div className="acct-card-head">
          <h2 id="profile-head">Profile</h2>
          {!editing ? (
            <button className="btn-link" onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : null}
        </div>

        {profileMsg ? (
          <div
            className={`notice mb-2 ${profileMsg.kind === "ok" ? "notice-ok" : "notice-error"}`}
            role={profileMsg.kind === "ok" ? "status" : "alert"}
          >
            {profileMsg.text}
          </div>
        ) : null}

        {!editing ? (
          <dl className="kv">
            <div>
              <dt>Name</dt>
              <dd>{c?.name || <span className="faint">Not set</span>}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd className="num">{formatPhone(c?.phone)}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{c?.address || <span className="faint">Not set</span>}</dd>
            </div>
          </dl>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
          >
            <div className="field">
              <label className="label" htmlFor="acc-name">
                Name
              </label>
              <input
                id="acc-name"
                className="input"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <span className="label">Phone</span>
              <p className="mb-0 num">{formatPhone(c?.phone)}</p>
              <p className="faint mt-1 mb-0">
                Your verified mobile. To use a different number, sign out and sign in with it.
              </p>
            </div>
            <div className="field">
              <label className="label" htmlFor="acc-address">
                Delivery address
              </label>
              <input
                id="acc-address"
                className="input"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="row" style={{ gap: "0.6rem" }}>
              <button className="btn" disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setName(c?.name ?? "");
                  setAddress(c?.address ?? "");
                  setProfileMsg(null);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── ID photo ────────────────────────────────────────────────────── */}
      <section className="panel acct-card" aria-labelledby="id-head">
        <div className="acct-card-head">
          <h2 id="id-head">ID Photo</h2>
          {c?.hasId ? (
            <span className="id-ok">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              On file
            </span>
          ) : null}
        </div>

        {idMsg ? (
          <div
            className={`notice mb-2 ${idMsg.kind === "ok" ? "notice-ok" : "notice-error"}`}
            role={idMsg.kind === "ok" ? "status" : "alert"}
          >
            {idMsg.text}
          </div>
        ) : null}

        <p className="muted" style={{ marginTop: 0 }}>
          {c?.hasId
            ? "A photo of your government-issued ID is on file. Upload a new one if your ID has changed."
            : "No ID photo on file. Upload a photo of your government-issued ID to place orders — your driver still checks the physical card at the door."}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          id="id-photo-file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadId(f);
          }}
        />
        <button
          type="button"
          className={`btn ${c?.hasId ? "btn-outline" : ""}`}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : c?.hasId ? "Replace ID photo" : "Upload ID photo"}
        </button>
      </section>

      {/* ── Orders ──────────────────────────────────────────────────────── */}
      <section className="panel acct-card acct-orders" aria-labelledby="orders-head">
        <div className="acct-card-head">
          <h2 id="orders-head">Order History</h2>
        </div>

        {orders === null ? <p className="muted">Loading orders…</p> : null}

        {orders?.length === 0 ? (
          <p className="muted">
            No orders yet.{" "}
            <Link className="link" href="/">
              Start shopping →
            </Link>
          </p>
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

      {/* Renders nothing at all when there are no offers. */}
      <CouponWallet />
    </div>
  );
}
