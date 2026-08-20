"use client";

import { useEffect, useState } from "react";

/**
 * The home-screen nudge. Two platforms, two truths:
 *   - Android (Chrome) fires `beforeinstallprompt`; we stash it and offer a
 *     real one-tap Install button.
 *   - iOS has no install API — and the share sheet a page can OPEN
 *     (navigator.share) is the generic URL sheet, which does NOT carry
 *     "Add to Home Screen". Field-verified on device: an "Add now" button
 *     opened a sheet where the action simply wasn't. The action lives ONLY in
 *     the sheet behind the BROWSER'S OWN share button, so teaching where that
 *     button is — per browser — is the honest best.
 * Shows immediately on the first post-gate page (the layout mounts this only
 * past the age check, so it can never front-run it), coarse-pointer devices
 * only, never inside an installed app, and a dismissal sleeps for two weeks.
 */

const SNOOZE_KEY = "ybs.install.snooze";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** A beat for the page to settle so the rise reads as an arrival, not a pop-in. */
const SHOW_DELAY_MS = 500;

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const shortName = process.env.NEXT_PUBLIC_SITE_SHORT_NAME || "YB";

export function InstallPrompt() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios" | "embedded">("hidden");
  const [bip, setBip] = useState<BipEvent | null>(null);
  const [iosHint, setIosHint] = useState<"safari" | "chrome" | "other">("other");

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((navigator as { standalone?: boolean }).standalone) return;
    try {
      if (Number(localStorage.getItem(SNOOZE_KEY) || 0) > Date.now()) return;
    } catch {}
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const ua = navigator.userAgent;
    const iosDevice =
      /iphone|ipod|ipad/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    // Embedded in-app browsers (Instagram, FB, TikTok, ...) have NO install
    // surface on either platform: beforeinstallprompt never fires in Android
    // webviews, and iOS webview share sheets don't carry Add to Home Screen —
    // teaching the share button there is a dead promise. Named tokens first;
    // the iOS fallback heuristic is a webview tell (real iOS browsers —
    // Safari, CriOS/FxiOS/EdgiOS — all end their UA with a Safari/ token,
    // embedded WKWebViews don't).
    const embedded =
      /\bwv\b|Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|MicroMessenger|GSA\//i.test(
        ua,
      ) || (iosDevice && !/Safari\//i.test(ua));

    let timer: number | undefined;
    if (embedded) {
      timer = window.setTimeout(() => setMode("embedded"), SHOW_DELAY_MS);
      return () => window.clearTimeout(timer);
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setBip(e as BipEvent);
      timer = window.setTimeout(() => setMode("android"), SHOW_DELAY_MS);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (iosDevice) {
      // Each browser parks its share button somewhere else; point at it.
      setIosHint(
        /CriOS\//.test(ua) ? "chrome" : /FxiOS|EdgiOS/.test(ua) ? "other" : "safari",
      );
      timer = window.setTimeout(() => setMode("ios"), SHOW_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (mode === "hidden") return null;

  const snooze = () => {
    setMode("hidden");
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {}
  };

  const install = async () => {
    if (!bip) return;
    snooze();
    try {
      await bip.prompt();
      await bip.userChoice;
    } catch {}
  };

  const shareGlyph = (
    <svg className="install-share" viewBox="0 0 16 20" aria-label="Share" role="img">
      <path
        d="M8 1v11M4.5 4.5 8 1l3.5 3.5M2 8v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div className="install-bar" role="region" aria-label="Add to home screen">
      <img className="install-icon" src="/icons/icon-192.png" alt="" width={40} height={40} />
      <div className="install-copy">
        <strong>Keep {shortName} on your home screen</strong>
        {mode === "android" ? (
          <span>One tap to install — opens full screen, like an app.</span>
        ) : mode === "embedded" ? (
          <span>
            You&rsquo;re in another app&rsquo;s browser. Open this site in your
            browser first (the <strong>&#8943;</strong> menu &rarr;{" "}
            <strong>Open in browser</strong>), then add it from there.
          </span>
        ) : iosHint === "chrome" ? (
          <span>
            Tap {shareGlyph} at the <strong>top right</strong>, then{" "}
            <strong>Add to Home Screen</strong>.
          </span>
        ) : iosHint === "safari" ? (
          <span>
            Tap {shareGlyph} at the <strong>bottom of your screen</strong>, then{" "}
            <strong>Add to Home Screen</strong>.
          </span>
        ) : (
          <span>
            Tap {shareGlyph} in your browser&rsquo;s menu, then{" "}
            <strong>Add to Home Screen</strong>.
          </span>
        )}
      </div>
      {mode === "android" && (
        <button className="btn btn-sm" onClick={install}>
          Install
        </button>
      )}
      <button className="install-close" aria-label="Not now" onClick={snooze}>
        ×
      </button>
    </div>
  );
}
