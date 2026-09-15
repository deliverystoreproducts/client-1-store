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

/**
 * ATTRIBUTION (ADS-01). Where the visit came from, so "did the ad work?" has an
 * answer that is ours rather than the ad platform's. Captured from the URL's
 * utm_* / gclid / fbclid / ttclid and, failing those, the referring host.
 *
 * Rule: a campaign click OVERWRITES (last non-direct touch, what every ad tool
 * reports against); a plain visit keeps whatever was captured within 30 days,
 * so the shopper who clicks the ad today and buys on Thursday still counts.
 * It travels on every event's meta, so the funnel can be read per source.
 *
 * Nothing here identifies a person: it is the query string the ad put on the
 * link and the host that linked here.
 */
const SRC_KEY = "ybs.src";
const SRC_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Attribution {
  /** utm_source | referring host | "direct" */
  s?: string;
  /** utm_medium */
  m?: string;
  /** utm_campaign */
  c?: string;
  /** utm_content */
  n?: string;
  /** utm_term */
  t?: string;
  /** click id (gclid / fbclid / ttclid / msclkid) */
  k?: string;
  /** referring host, when it is not us */
  r?: string;
  /** the page the visit landed on */
  lp?: string;
  /** captured at (ms) */
  at: number;
}

function trimmed(v: string | null, max = 120): string | undefined {
  const x = (v ?? "").trim();
  return x ? x.slice(0, max) : undefined;
}

function fromUrl(): Attribution | null {
  const q = new URLSearchParams(window.location.search);
  const click =
    trimmed(q.get("gclid")) ?? trimmed(q.get("fbclid")) ?? trimmed(q.get("ttclid")) ?? trimmed(q.get("msclkid"));
  const source = trimmed(q.get("utm_source"));
  if (!source && !click) return null;
  const a: Attribution = { at: Date.now() };
  if (source) a.s = source;
  else if (click) a.s = q.get("gclid") ? "google" : q.get("fbclid") ? "meta" : q.get("ttclid") ? "tiktok" : "bing";
  const m = trimmed(q.get("utm_medium"));
  const c = trimmed(q.get("utm_campaign"));
  const n = trimmed(q.get("utm_content"));
  const t = trimmed(q.get("utm_term"));
  if (m) a.m = m;
  if (c) a.c = c;
  if (n) a.n = n;
  if (t) a.t = t;
  if (click) a.k = click;
  if (!a.m && click) a.m = "cpc";
  a.lp = window.location.pathname.slice(0, 200);
  const r = referringHost();
  if (r) a.r = r;
  return a;
}

function referringHost(): string | undefined {
  try {
    const ref = document.referrer;
    if (!ref) return undefined;
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h === window.location.hostname.replace(/^www\./, "")) return undefined;
    return h.slice(0, 120);
  } catch {
    return undefined;
  }
}

/** The attribution to report with this event, or null for an unattributed visit. */
function attribution(): Attribution | null {
  try {
    const fresh = fromUrl();
    if (fresh) {
      localStorage.setItem(SRC_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const raw = localStorage.getItem(SRC_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Attribution;
      if (saved && typeof saved.at === "number" && Date.now() - saved.at < SRC_TTL_MS) return saved;
    }
    const r = referringHost();
    if (r) {
      const a: Attribution = { s: r, m: "referral", r, lp: window.location.pathname.slice(0, 200), at: Date.now() };
      localStorage.setItem(SRC_KEY, JSON.stringify(a));
      return a;
    }
  } catch {
    /* storage refused — an unattributed event beats a thrown one */
  }
  return null;
}

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
    const src = attribution();
    const meta = src ? { ...(data.meta ?? {}), src } : (data.meta ?? null);
    const body = JSON.stringify({
      visitorId: visitorId(),
      sessionId: sessionId(),
      event,
      page: data.page ?? window.location.pathname,
      productId: data.productId ?? null,
      meta,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/track", blob)) return;
    void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    /* never in the way */
  }
}
