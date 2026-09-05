"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { currentSubscription, fetchPushConfig, isStandalone, pushSupported, storedReward } from "@/lib/push-client";

/**
 * The in-app half of the offer (APP-REWARD-01). Someone who opened the store
 * from their home screen has done step 1; if notifications are still off, a
 * bar points them at /app for the rest — leading with the discount when the
 * shop runs one, and with the delivery alerts when it does not.
 * Never shown in a plain browser tab (that is InstallPrompt's job), never on
 * /app itself, gone for good once a code has been earned on this device, and
 * a dismissal sleeps for a week.
 */
const SNOOZE_KEY = "ybs.nudge.snooze";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function AppNudge() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isStandalone() || !pushSupported()) return;
    if (Notification.permission === "denied" || storedReward()) return;
    try { if (Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()) return; } catch {}
    let live = true;
    fetchPushConfig().then(async (c) => {
      if (!live || !c.enabled) return;
      if (await currentSubscription()) return;
      setPercent(c.rewardPercent);
      setShow(true);
    });
    return () => { live = false; };
  }, []);

  if (!show || pathname === "/app") return null;

  const snooze = () => {
    setShow(false);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch {}
  };

  return (
    <div className="install-bar" role="region" aria-label="Turn on notifications">
      <Link href="/app" className="install-copy install-link" onClick={() => setShow(false)}>
        <strong>{percent ? `Turn on notifications — get ${percent}% off` : "Turn on notifications"}</strong>
        <span>Know the moment your driver&rsquo;s on the way. One tap, this device only.</span>
      </Link>
      <button className="install-close" aria-label="Not now" onClick={snooze}>×</button>
    </div>
  );
}
