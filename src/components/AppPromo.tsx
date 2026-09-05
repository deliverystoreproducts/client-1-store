"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInFlow } from "@/components/SignInFlow";
import {
  PushDeniedError,
  claimReward,
  currentSubscription,
  detectPlatform,
  fetchPushConfig,
  isStandalone,
  pushSupported,
  storedReward,
  subscribeToPush,
  type Platform,
  type RewardResult,
} from "@/lib/push-client";
import type { SessionState } from "@/lib/public-types";

/**
 * The "Get the app" page — APP-REWARD-01.
 *
 * Three steps, each one live: the page reads where the visitor actually is
 * (installed? signed in? subscribed?) and ticks what is already done, so a
 * customer who comes back from the home-screen icon lands on the one step
 * that is left. The reward is paid by the platform on the subscription — the
 * install itself cannot be verified, and on iPhone push does not work outside
 * the installed app, so step 1 is a real prerequisite there and a courtesy
 * elsewhere.
 */

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type PushState = "checking" | "unsupported" | "off" | "working" | "on" | "denied";

const shortName = process.env.NEXT_PUBLIC_SITE_SHORT_NAME || "YB";

function ShareGlyph() {
  return (
    <svg className="install-share" viewBox="0 0 16 20" aria-label="Share" role="img">
      <path d="M8 1v11M4.5 4.5 8 1l3.5 3.5M2 8v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppPromo({ siteName, requireIdPhoto }: { siteName: string; requireIdPhoto: boolean }) {
  const [percent, setPercent] = useState<number | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [bip, setBip] = useState<BipEvent | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [push, setPush] = useState<PushState>("checking");
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());
    setPlatform(detectPlatform());
    const onBip = (e: Event) => { e.preventDefault(); setBip(e as BipEvent); };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    fetch("/api/auth/me").then((r) => r.json()).then(setSession).catch(() => setSession(null));
    fetchPushConfig().then(async (c) => {
      setPercent(c.rewardPercent);
      setPublicKey(c.publicKey);
      if (!c.enabled || !pushSupported()) { setPush("unsupported"); return; }
      if (Notification.permission === "denied") { setPush("denied"); return; }
      const sub = await currentSubscription();
      setPush(sub ? "on" : "off");
      if (sub && c.rewardPercent > 0) setReward(storedReward());
    });
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Signed in + subscribed + no code yet: claim (covers "subscribed before signing in").
  useEffect(() => {
    if (!session?.authenticated || push !== "on" || reward || !percent) return;
    currentSubscription().then((sub) => sub && claimReward(sub.endpoint).then((r) => r && setReward(r)));
  }, [session, push, reward, percent]);

  async function turnOn() {
    if (!publicKey) return;
    setError(null);
    setPush("working");
    try {
      const sub = await subscribeToPush(publicKey);
      setPush("on");
      if (percent) {
        const r = await claimReward(sub.endpoint);
        if (r) setReward(r);
        else setError("Notifications are on, but the code didn't come through. Refresh this page in a moment — it will be here.");
      }
    } catch (e) {
      if (e instanceof PushDeniedError && e.message === "denied") setPush("denied");
      else { setPush("off"); setError("That didn't work. Try again in a moment."); }
    }
  }

  const signedIn = !!session?.authenticated;
  const iosNeedsInstall = !!platform?.ios && !installed;
  const step1 = installed ? "done" : "current";
  const step2 = signedIn ? "done" : installed || !platform?.coarse ? "current" : "todo";
  const step3 = push === "on" ? "done" : signedIn ? "current" : "todo";
  const allDone = (installed || !platform?.coarse) && signedIn && push === "on";
  const expires = reward ? new Date(reward.expiresAt).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "";

  return (
    <div className="app-promo">
      <header className="app-promo-head">
        <img className="app-promo-icon" src="/icons/icon-192.png" alt="" width={72} height={72} />
        {percent ? (
          <>
            <h1>Get {percent}% off your next order</h1>
            <p className="app-promo-lede">
              Add {siteName} to your home screen and turn on notifications. It takes a minute — and you&rsquo;ll know the moment your driver is on the way.
            </p>
          </>
        ) : (
          <>
            <h1>Get the {shortName} app</h1>
            <p className="app-promo-lede">
              Add {siteName} to your home screen for one-tap ordering, and turn on notifications to know the moment your driver is on the way.
            </p>
          </>
        )}
      </header>

      {reward ? (
        <section className="panel app-promo-reward" aria-live="polite">
          <p className="app-promo-reward-label">You&rsquo;re all set</p>
          <p className="app-promo-done">
            Your <strong>{reward.value}% off</strong> comes off automatically at checkout — nothing to type.
          </p>
          <p className="faint mb-0">
            Code <code className="reward-code">{reward.code}</code>, valid until {expires}, one per customer. It&rsquo;s also under Your offers in <Link className="link" href="/account">your account</Link>.
          </p>
          <Link className="btn" href="/products">Start shopping</Link>
        </section>
      ) : allDone ? (
        <section className="panel app-promo-reward" aria-live="polite">
          <p className="app-promo-reward-label">You&rsquo;re all set</p>
          <p className="app-promo-done">You&rsquo;ll know the moment your driver is on the way.</p>
          <Link className="btn" href="/products">Start shopping</Link>
        </section>
      ) : null}

      <ol className="app-steps">
        {/* ── 1 · home screen ─────────────────────────────────────────── */}
        <li className="app-step" data-state={step1}>
          <span className="app-step-num" aria-hidden>{installed ? "✓" : "1"}</span>
          <div className="app-step-body">
            <h2>Add {shortName} to your home screen</h2>
            {installed ? (
              <p className="faint">Done — you&rsquo;re in the app.</p>
            ) : !platform ? null : platform.embedded ? (
              <p>
                You&rsquo;re in another app&rsquo;s browser, which can&rsquo;t install anything. Open this page in your browser first (the <strong>&#8943;</strong> menu &rarr; <strong>Open in browser</strong>), then come back here.
              </p>
            ) : platform.ios ? (
              <>
                <p>
                  {platform.iosHint === "chrome" ? (
                    <>Tap <ShareGlyph /> at the <strong>top right</strong></>
                  ) : platform.iosHint === "safari" ? (
                    <>Tap <ShareGlyph /> at the <strong>bottom of your screen</strong></>
                  ) : (
                    <>Tap <ShareGlyph /> in your browser&rsquo;s menu</>
                  )}
                  , scroll down and choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
                </p>
                <p className="faint">
                  Then open {shortName} from the new icon and come back to this page — on iPhone, notifications only work from the home-screen app.
                </p>
              </>
            ) : bip ? (
              <>
                <p>One tap — it opens full screen, like an app.</p>
                <button className="btn" type="button" onClick={async () => { try { await bip.prompt(); await bip.userChoice; } catch {} }}>
                  Install {shortName}
                </button>
              </>
            ) : platform.android ? (
              <p>
                Open your browser&rsquo;s <strong>&#8942;</strong> menu and choose <strong>Add to Home screen</strong> (or <strong>Install app</strong>).
              </p>
            ) : (
              <p className="faint">
                You&rsquo;re on a computer — open this page on your phone to add the app. Notifications work here too, so you can skip ahead.
              </p>
            )}
          </div>
        </li>

        {/* ── 2 · sign in ─────────────────────────────────────────────── */}
        <li className="app-step" data-state={step2}>
          <span className="app-step-num" aria-hidden>{signedIn ? "✓" : "2"}</span>
          <div className="app-step-body">
            <h2>Sign in</h2>
            {session === null ? (
              <p className="faint">Checking…</p>
            ) : signedIn ? (
              <p className="faint">Signed in as {session.customer?.name || session.customer?.phone}.</p>
            ) : (
              <>
                <p className="faint">The code goes on your account, so we need to know whose it is.</p>
                <div className="app-step-signin">
                  <SignInFlow
                    requireIdPhoto={requireIdPhoto}
                    initialStep={session.pendingRegistration ? "profile" : "phone"}
                    onSignedIn={() => fetch("/api/auth/me").then((r) => r.json()).then(setSession)}
                  />
                </div>
              </>
            )}
          </div>
        </li>

        {/* ── 3 · notifications ──────────────────────────────────────── */}
        <li className="app-step" data-state={step3}>
          <span className="app-step-num" aria-hidden>{push === "on" ? "✓" : "3"}</span>
          <div className="app-step-body">
            <h2>Turn on notifications</h2>
            {push === "on" ? (
              <p className="faint">Done — notifications are on for this device.{percent && !reward && signedIn ? " Fetching your code…" : ""}</p>
            ) : push === "denied" ? (
              <p>Notifications are blocked for this site in your browser settings. Allow them there, then reload this page.</p>
            ) : push === "unsupported" && iosNeedsInstall ? (
              <p className="faint">Finish step 1 first, then open {shortName} from your home screen.</p>
            ) : push === "unsupported" ? (
              <p className="faint">This browser can&rsquo;t receive notifications.</p>
            ) : (
              <>
                <p className="faint">
                  Delivery updates and the occasional deal. No texts — just this device, and you can turn it off any time in your account.
                </p>
                <button className="btn" type="button" onClick={turnOn} disabled={push !== "off" || !signedIn}>
                  {push === "working" ? "One moment…" : percent ? `Turn on notifications · get ${percent}% off` : "Turn on notifications"}
                </button>
                {!signedIn ? <p className="faint mt-2">Sign in above first.</p> : null}
              </>
            )}
            {error ? <div className="notice notice-error mt-2" role="alert">{error}</div> : null}
          </div>
        </li>
      </ol>

      {percent ? (
        <p className="faint app-promo-fine">
          One reward per customer, {percent}% off one order, valid 30 days from the day it&rsquo;s earned. Can&rsquo;t be combined with other coupons. Turning notifications off later doesn&rsquo;t cancel a code you already have.
        </p>
      ) : null}
    </div>
  );
}
