"use client";

import { useEffect, useState } from "react";

/**
 * "Turn on notifications" — PUSH-WEB-01.
 *
 * Shown only where it can work (a browser with push, permission not denied,
 * not already subscribed) and only after the visitor has done something —
 * this mounts on the order confirmation and the account page, never on a
 * first landing. One tap: browser permission → push subscription → relayed
 * to the platform. Turning it off again is a tap on the same card.
 */
type State = "unsupported" | "idle" | "working" | "on" | "off" | "denied";

function toKey(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function PushPrompt({ context }: { context: "confirmation" | "account" }) {
  const [state, setState] = useState<State>("idle");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }
    fetch("/api/push/config")
      .then((r) => r.json())
      .then(async (c: { enabled: boolean; publicKey: string | null }) => {
        if (!c.enabled || !c.publicKey) { setState("unsupported"); return; }
        setPublicKey(c.publicKey);
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    if (!publicKey) return;
    setState("working");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState(perm === "denied" ? "denied" : "off"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource });
      const json = sub.toJSON();
      let visitorId: string | null = null;
      try { visitorId = localStorage.getItem("ybs.vid"); } catch {}
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys, visitorId }),
      });
      if (!res.ok) throw new Error();
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function turnOff() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
    } catch {}
    setState("off");
  }

  if (state === "unsupported") return null;

  return (
    <section className="panel acct-card" aria-labelledby="push-head">
      <div className="acct-card-head">
        <h2 id="push-head">{context === "confirmation" ? "Know when your order moves" : "Notifications"}</h2>
      </div>
      {state === "denied" ? (
        <p className="faint mb-0">Notifications are blocked for this site in your browser settings.</p>
      ) : state === "on" ? (
        <>
          <p>Notifications are on for this device — delivery updates and the occasional deal.</p>
          <button className="btn btn-ghost btn-sm" type="button" onClick={turnOff} disabled={false}>Turn off</button>
        </>
      ) : (
        <>
          <p>Get a notification when your driver is on the way, and hear about deals first. No texts, no phone number — just this device, and you can turn it off any time.</p>
          <button className="btn" type="button" onClick={turnOn} disabled={state === "working"}>
            {state === "working" ? "One moment…" : "Turn on notifications"}
          </button>
        </>
      )}
    </section>
  );
}
