/**
 * Browser-side push helpers shared by the notifications card, the promo page
 * and the nudges (PUSH-WEB-01 / APP-REWARD-01). Everything here runs in the
 * browser; the platform is reached only through the same-origin relays.
 */

export interface PushConfig {
  enabled: boolean;
  publicKey: string | null;
  /** Percent off for installing + turning notifications on; 0 = no offer. */
  rewardPercent: number;
}

export interface RewardResult {
  code: string;
  value: number;
  expiresAt: string;
  already: boolean;
}

/** The reward once earned on this device — so nudges stop for good. */
export const REWARD_KEY = "ybs.push.reward";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    !!(navigator as { standalone?: boolean }).standalone
  );
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type Platform = {
  ios: boolean;
  android: boolean;
  /** An in-app browser (Instagram, TikTok, …) — no install surface at all. */
  embedded: boolean;
  /** Where this iOS browser keeps its share button. */
  iosHint: "safari" | "chrome" | "other";
  /** A touch device — the home screen is a real thing here. */
  coarse: boolean;
};

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  const ios =
    /iphone|ipod|ipad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const embedded =
    /\bwv\b|Instagram|FBAN|FBAV|FB_IAB|TikTok|musical_ly|BytedanceWebview|Snapchat|Line\/|MicroMessenger|GSA\//i.test(ua) ||
    (ios && !/Safari\//i.test(ua));
  return {
    ios,
    android: /android/i.test(ua),
    embedded,
    iosHint: /CriOS\//.test(ua) ? "chrome" : /FxiOS|EdgiOS/.test(ua) ? "other" : "safari",
    coarse: window.matchMedia("(pointer: coarse)").matches,
  };
}

export async function fetchPushConfig(): Promise<PushConfig> {
  try {
    const r = await fetch("/api/push/config");
    const c = (await r.json()) as Partial<PushConfig>;
    return {
      enabled: !!c.enabled && !!c.publicKey,
      publicKey: c.publicKey ?? null,
      rewardPercent: Number(c.rewardPercent) || 0,
    };
  } catch {
    return { enabled: false, publicKey: null, rewardPercent: 0 };
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

function toKey(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export class PushDeniedError extends Error {}

/** Permission → subscription → relayed to the platform. Throws PushDeniedError
 *  when the browser refused, a plain Error for anything else. */
export async function subscribeToPush(publicKey: string): Promise<PushSubscription> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new PushDeniedError(perm);
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource }));
  const json = sub.toJSON();
  let visitorId: string | null = null;
  try { visitorId = localStorage.getItem("ybs.vid"); } catch {}
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys, visitorId }),
  });
  if (!res.ok) throw new Error("subscribe_failed");
  return sub;
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  try {
    await fetch("/api/push/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
  } catch {}
  await sub.unsubscribe();
}

/**
 * Claim the install reward for this subscription. Resolves to null when there
 * is nothing to claim — signed out, offer off, or the platform does not know
 * this subscription yet — so callers can ignore it silently.
 */
export async function claimReward(endpoint: string): Promise<RewardResult | null> {
  try {
    const res = await fetch("/api/push/reward", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint }),
    });
    if (!res.ok) return null;
    const r = (await res.json()) as RewardResult;
    if (!r?.code) return null;
    try { localStorage.setItem(REWARD_KEY, JSON.stringify(r)); } catch {}
    return r;
  } catch {
    return null;
  }
}

export function storedReward(): RewardResult | null {
  try {
    const raw = localStorage.getItem(REWARD_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as RewardResult;
    return r?.code ? r : null;
  } catch {
    return null;
  }
}
