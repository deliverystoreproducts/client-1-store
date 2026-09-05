"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PushDeniedError,
  claimReward,
  currentSubscription,
  fetchPushConfig,
  isStandalone,
  pushSupported,
  storedReward,
  subscribeToPush,
} from "@/lib/push-client";

/**
 * The in-app half of the offer (APP-REWARD-01). Someone who opened the store
 * from their home screen has done step 1; if notifications are still off, a
 * bar offers to turn them on RIGHT HERE — one tap on our button, then the
 * browser's own prompt. Subscribing needs no account; only the coupon does,
 * so after a successful tap the bar either shows the code (signed in) or
 * points at /app to sign in and collect it. Never shown in a plain browser
 * tab (that is InstallPrompt's job), never on /app, gone for good once a
 * code has been earned on this device, and a dismissal sleeps for a week.
 */
const SNOOZE_KEY = "ybs.nudge.snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

type Phase = "hidden" | "offer" | "working" | "on" | "collect" | "denied";

export function AppNudge() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("hidden");
  const [percent, setPercent] = useState(0);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isStandalone() || !pushSupported()) return;
    if (Notification.permission === "denied" || storedReward()) return;
    try { if (Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()) return; } catch {}
    let live = true;
    fetchPushConfig().then(async (c) => {
      if (!live || !c.enabled || !c.publicKey) return;
      if (await currentSubscription()) return;
      setPercent(c.rewardPercent);
      setPublicKey(c.publicKey);
      setPhase("offer");
    });
    return () => { live = false; };
  }, []);

  if (phase === "hidden" || pathname === "/app") return null;

  const snooze = () => {
    setPhase("hidden");
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
  };

  async function turnOn() {
    if (!publicKey) return;
    setPhase("working");
    try {
      const sub = await subscribeToPush(publicKey);
      if (!percent) { setPhase("on"); return; }
      const r = await claimReward(sub.endpoint);
      if (r) { setCode(r.code); setPhase("on"); }
      else setPhase("collect"); // subscribed, but not signed in — the code waits on /app
    } catch (e) {
      setPhase(e instanceof PushDeniedError && e.message === "denied" ? "denied" : "offer");
    }
  }

  return (
    <div className="install-bar" role="region" aria-label="Turn on notifications">
      <div className="install-copy">
        {phase === "on" ? (
          <>
            <strong>Notifications are on</strong>
            <span>{code ? <>Your {percent}% code: <code className="reward-code">{code}</code></> : "You'll know the moment your driver's on the way."}</span>
          </>
        ) : phase === "collect" ? (
          <>
            <strong>Notifications are on — one more step for your {percent}% off</strong>
            <span><Link className="link" href="/app">Sign in to get your code</Link></span>
          </>
        ) : phase === "denied" ? (
          <>
            <strong>Notifications are blocked</strong>
            <span>Allow them for this app in your phone&rsquo;s Settings, then try again.</span>
          </>
        ) : (
          <>
            <strong>{percent ? `Turn on notifications — get ${percent}% off` : "Turn on notifications"}</strong>
            <span>Know the moment your driver&rsquo;s on the way. One tap, this device only.</span>
          </>
        )}
      </div>
      {phase === "offer" || phase === "working" ? (
        <button className="btn btn-sm" type="button" onClick={turnOn} disabled={phase === "working"}>
          {phase === "working" ? "…" : "Turn on"}
        </button>
      ) : null}
      <button className="install-close" aria-label={phase === "on" || phase === "collect" ? "Close" : "Not now"} onClick={phase === "on" ? () => setPhase("hidden") : snooze}>×</button>
    </div>
  );
}
