import "server-only";

import { cookies } from "next/headers";

/**
 * Customer session custody.
 *
 * The upstream customer token NEVER reaches browser JavaScript. It lives in an
 * httpOnly cookie that this server attaches to upstream calls as
 * `x-customer-token`. A token readable by JS is a token stealable by any XSS on
 * any page of the site, and it authorises placing orders.
 *
 * `__Host-` prefix: the browser itself then enforces Secure + Path=/ + no
 * Domain, so a sibling subdomain (or anything that can set cookies for the
 * registrable domain) cannot overwrite our session cookie with one of its own.
 *
 * Local development note: `Secure` is required by the prefix. Chrome, Firefox
 * and Safari all treat http://localhost as a secure context, so this works in
 * `pnpm dev` without an exception. It will NOT work over plain http on a LAN IP
 * — use localhost or a TLS tunnel.
 */

const TOKEN_COOKIE = "__Host-ybs_session";
/** Marks the token as the short-lived verified-phone kind, not a full session. */
const PENDING_COOKIE = "__Host-ybs_pending";
const AGE_COOKIE = "__Host-ybs_age";

const BASE = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  // No `domain` — required for the __Host- prefix to be accepted.
};

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const PENDING_MAX_AGE = 60 * 20; // the verified-phone token is short-lived upstream
const AGE_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionKind = "customer" | "pending";

export async function readSessionToken(): Promise<{ token: string; kind: SessionKind } | null> {
  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  const kind: SessionKind = jar.get(PENDING_COOKIE)?.value === "1" ? "pending" : "customer";
  return { token, kind };
}

/** The token for calls that require a full customer session. */
export async function readCustomerToken(): Promise<string | null> {
  const s = await readSessionToken();
  return s && s.kind === "customer" ? s.token : null;
}

/** The token for /auth/register only. */
export async function readPendingToken(): Promise<string | null> {
  const s = await readSessionToken();
  return s && s.kind === "pending" ? s.token : null;
}

export async function setCustomerSession(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, { ...BASE, maxAge: SESSION_MAX_AGE });
  jar.set(PENDING_COOKIE, "", { ...BASE, maxAge: 0 });
}

export async function setPendingSession(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, { ...BASE, maxAge: PENDING_MAX_AGE });
  jar.set(PENDING_COOKIE, "1", { ...BASE, maxAge: PENDING_MAX_AGE });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, "", { ...BASE, maxAge: 0 });
  jar.set(PENDING_COOKIE, "", { ...BASE, maxAge: 0 });
}

// ─────────────────────────── age gate ───────────────────────────

export async function hasPassedAgeGate(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(AGE_COOKIE)?.value === "1";
}

export async function setAgeGatePassed(): Promise<void> {
  const jar = await cookies();
  jar.set(AGE_COOKIE, "1", { ...BASE, maxAge: AGE_MAX_AGE });
}
