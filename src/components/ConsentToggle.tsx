"use client";

import { useState } from "react";
import { apiPatch, ClientApiError } from "@/lib/client-api";
import { MARKETING_CONSENT_TEXT } from "@/lib/site";

/**
 * CONSENT-01 — the account's marketing-text switch. Shows the same words as
 * checkout; a tick records consent (with those words and a timestamp), an
 * untick records the opt-out. Both are one request and take effect at once.
 */
export function ConsentToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function change(next: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      await apiPatch("/api/auth/me", { marketingConsent: next });
      setOn(next);
      setMsg(next ? "You're in. Reply STOP to any text to opt out." : "Done — no more marketing texts.");
    } catch (e) {
      setMsg(e instanceof ClientApiError ? e.message : "We couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel acct-card" aria-labelledby="consent-head">
      <div className="acct-card-head">
        <h2 id="consent-head">Texts from us</h2>
      </div>
      <label className="row" style={{ gap: "0.6rem", alignItems: "flex-start" }}>
        <input type="checkbox" checked={on} disabled={busy} onChange={(e) => change(e.target.checked)} style={{ marginTop: "0.25rem" }} />
        <span style={{ fontSize: "0.9rem", lineHeight: 1.4 }}>{MARKETING_CONSENT_TEXT}</span>
      </label>
      {msg ? <p className="faint mt-1 mb-0">{msg}</p> : null}
      <p className="faint mt-1 mb-0">Order updates (your code, your driver on the way) are not affected by this.</p>
    </section>
  );
}
