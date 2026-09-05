"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentSubscription, fetchPushConfig, isStandalone, pushSupported, storedReward } from "@/lib/push-client";

/**
 * The in-app half of the offer (APP-REWARD-01). Someone who opened the store
 * from their home screen has done step 1; if notifications are still off and
 * the shop is running the reward, a bar points them at /app for the rest.
 * Never shown in a plain browser tab (that is InstallPrompt's job), never on
 * /app itself, gone for good once a code has been earned on this device, and
 * a dismissal sleeps for a week.
 */
const SNOOZE_KEY = "ybs.nudge.snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function AppNudge() {
  const pathname = usePathname();
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isStandalone() || !pushSupported()) return;
    if (Notification.permission === "denied" || storedReward()) return;
    try { if (Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()) return; } catch {}
    let live = true;
    fetchPushConfig().then(async (c) => {
      if (!live || !c.enabled || c.rewardPercent <= 0) return;
      if (await currentSubscription()) return;
      setPercent(c.rewardPercent);
    });
    return () => { live = false; };
  }, []);

  if (!percent || pathname === "/app") return null;

  const snooze = () => {
    setPercent(0);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
  };

  return (
    <div className="install-bar" role="region" aria-label="Turn on notifications">
      <Link href="/app" className="install-copy install-link" onClick={() => setPercent(0)}>
        <strong>Turn on notifications — get {percent}% off</strong>
        <span>Know when your driver&rsquo;s on the way. One tap, this device only.</span>
      </Link>
      <button className="install-close" aria-label="Not now" onClick={snooze}>×</button>
    </div>
  );
}
