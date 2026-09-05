"use client";

/**
 * First-party usage events — ANALYTICS-01.
 *
 * WHAT THIS IS. The dashboard's Analytics page (funnel, top searches, abandoned
 * carts, sessions) reads a `ShopEvent` table on the platform. Nothing on this
 * storefront ever wrote to it, so the shop has had no numbers at all. This is
 * the missing half.
 *
 * WHAT THIS IS NOT. Not a third-party script and not a third-party request.
 * Every event goes to THIS origin's /api/track, which relays it server-side.
 * The browser still talks to nobody but us — the CSP (connect-src 'self') is
 * unchanged, and the privacy policy's sentence about it stays true.
 *
 * IDS. `visitorId` is a random id kept in localStorage (a returning device);
 * `sessionId` is a random id kept in sessionStorage and rotated after 30 min
 * idle (a visit). Neither is derived from anything about the person. Both
 * are what the dashboard groups by.
 *
 * NEVER IN THE WAY. sendBeacon (or a keepalive fetch), fire-and-forget, every
 * failure swallowed. A tracker that can slow a page or throw into checkout is
 * worse than no tracker.
 */
export type TrackedEvent =
  | "page_view"
  | "product_view"
  | "add_to_cart"
  | "cart_view"
  | "checkout_start"
  | "checkout_phone"
  | "checkout_otp"
  | "checkout_register"
  | "order_placed"
  | "search";

const VISITOR_KEY = "ybs.vid";
const SESSION_KEY = "ybs.sid";
const SESSION_AT_KEY = "ybs.sid.at";
const SESSION_IDLE_MS = 30 * 60 * 1000;

function rid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

function visitorId(): string {
  try {
    const v = localStorage.getItem(VISITOR_KEY);
    if (v) return v;
    const n = rid();
    localStorage.setItem(VISITOR_KEY, n);
    return n;
  } catch {
    return "anon";
  }
}

function sessionId(): string {
  try {
    const now = Date.now();
    const at = Number(sessionStorage.getItem(SESSION_AT_KEY) || 0);
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s || now - at > SESSION_IDLE_MS) {
      s = rid();
      sessionStorage.setItem(SESSION_KEY, s);
    }
    sessionStorage.setItem(SESSION_AT_KEY, String(now));
    return s;
  } catch {
    return "anon";
  }
}

export function track(
  event: TrackedEvent,
  data: { page?: string; productId?: number; meta?: Record<string, unknown> } = {},
): void {
  if (typeof window === "undefined") return;
  try {
    // Automation and headless browsers are not shoppers.
    if (navigator.webdriver) return;
    const body = JSON.stringify({
      visitorId: visitorId(),
      sessionId: sessionId(),
      event,
      page: data.page ?? window.location.pathname,
      productId: data.productId ?? null,
      meta: data.meta ?? null,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/track", blob)) return;
    void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    /* never in the way */
  }
}
