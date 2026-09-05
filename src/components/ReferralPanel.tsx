"use client";

import { useEffect, useState } from "react";

/**
 * "Refer a friend" — REF-01. Surfaces a programme the platform has run for
 * months and this store never exposed: the friend orders once, the referrer
 * gets $10 off (up to ten times; each reward lasts 30 days). The link carries
 * a signed token, not the phone number.
 */
export function ReferralPanel() {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral/link")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { url: string }) => { setUrl(d.url); setState("ready"); })
      .catch(() => setState("off"));
  }, []);

  if (state === "off") return null;

  async function share() {
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Get your order delivered", text: "Order through my link", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* user dismissed */ }
  }

  return (
    <section className="panel acct-card" aria-labelledby="refer-head">
      <div className="acct-card-head">
        <h2 id="refer-head">Refer a friend</h2>
      </div>
      <p>
        Send a friend your link. After their first order you get <strong>$10 off</strong> your next one —
        up to ten times. Each reward lasts 30 days and shows up in your coupons below.
      </p>
      {state === "ready" && url ? (
        <div className="refer-row">
          <input className="input num" readOnly value={url} aria-label="Your referral link" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn" type="button" onClick={share}>
            {copied ? "Copied" : typeof navigator !== "undefined" && "share" in navigator ? "Share" : "Copy link"}
          </button>
        </div>
      ) : (
        <p className="faint">Loading your link…</p>
      )}
      <p className="faint mb-0">
        Ordering without the link? Your friend can give the driver your phone number at the door, or type it at checkout under &ldquo;Referred by a friend&rdquo;.
      </p>
    </section>
  );
}
