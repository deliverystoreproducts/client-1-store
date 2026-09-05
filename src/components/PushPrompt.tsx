"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PushDeniedError,
  claimReward,
  currentSubscription,
  fetchPushConfig,
  pushSupported,
  storedReward,
  subscribeToPush,
  unsubscribeFromPush,
  type RewardResult,
} from "@/lib/push-client";

/**
 * "Turn on notifications" — PUSH-WEB-01.
 *
 * Shown only where it can work (a browser with push, permission not denied,
 * not already subscribed) and only after the visitor has done something —
 * this mounts on the order confirmation and the account page, never on a
 * first landing. One tap: browser permission → push subscription → relayed
 * to the platform. Turning it off again is a tap on the same card.
 *
 * APP-REWARD-01: when the shop runs the install offer, the same tap claims
 * the coupon (both mount points are signed-in pages) and the code is shown
 * right here; the promo page at /app explains the whole thing.
 */
type State = "unsupported" | "idle" | "working" | "on" | "off" | "denied";

export function PushPrompt({ context }: { context: "confirmation" | "account" }) {
  const [state, setState] = useState<State>("idle");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [rewardPercent, setRewardPercent] = useState(0);
  const [reward, setReward] = useState<RewardResult | null>(null);

  useEffect(() => {
    if (!pushSupported()) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    fetchPushConfig()
      .then(async (c) => {
        if (!c.enabled || !c.publicKey) { setState("unsupported"); return; }
        setPublicKey(c.publicKey);
        setRewardPercent(c.rewardPercent);
        const sub = await currentSubscription();
        setState(sub ? "on" : "off");
        if (sub && c.rewardPercent > 0) {
          // Already on: show the code they earned (or quietly earn it now —
          // e.g. they subscribed signed-out, and are signed in here).
          setReward(storedReward() ?? (await claimReward(sub.endpoint)));
        }
      })
      .catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    if (!publicKey) return;
    setState("working");
    try {
      const sub = await subscribeToPush(publicKey);
      setState("on");
      if (rewardPercent > 0) setReward(await claimReward(sub.endpoint));
    } catch (e) {
      setState(e instanceof PushDeniedError && e.message === "denied" ? "denied" : "off");
    }
  }

  async function turnOff() {
    setState("working");
    try { await unsubscribeFromPush(); } catch {}
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
          {reward ? (
            <p className="reward-line">
              Your {reward.value}% off code: <code className="reward-code">{reward.code}</code>
              <span className="faint"> — it&rsquo;s also under Your offers, apply it at checkout.</span>
            </p>
          ) : null}
          <button className="btn btn-ghost btn-sm" type="button" onClick={turnOff} disabled={false}>Turn off</button>
        </>
      ) : (
        <>
          <p>
            Get a notification when your driver is on the way, and hear about deals first. No texts, no phone number — just this device, and you can turn it off any time.
            {rewardPercent > 0 ? (
              <> <strong>Turn them on and get {rewardPercent}% off your next order.</strong> <Link className="link" href="/app">How it works</Link></>
            ) : null}
          </p>
          <button className="btn" type="button" onClick={turnOn} disabled={state === "working"}>
            {state === "working" ? "One moment…" : rewardPercent > 0 ? `Turn on notifications · ${rewardPercent}% off` : "Turn on notifications"}
          </button>
        </>
      )}
    </section>
  );
}
