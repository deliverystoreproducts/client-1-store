import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getUpstreamConfig } from "@/lib/kamui/env";

/**
 * Referral share links — REF-01.
 *
 * The platform's referral programme is keyed by the REFERRER'S PHONE: at the
 * friend's first checkout, `referredBy: <phone>` earns the referrer a $10
 * coupon (max 10, 30-day expiry). A link that carried a phone number in the
 * URL would be shared in group chats, screenshots and browser histories, so
 * the link carries a signed, opaque token instead and the phone is recovered
 * server-side at checkout.
 *
 * The token is integrity-protected, not secret: base64url(digits).base64url(mac)
 * where mac = HMAC-SHA256 over the digits with a key derived from the store's
 * API key (server-only, stable per deployment). Forging one requires the key;
 * tampering breaks the MAC; and the worst a valid token can do is credit the
 * person it names.
 */
const REF_COOKIE = "__Host-ybs_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 30; // a referral stands for 30 days

function key(): Buffer {
  return createHmac("sha256", "ybs-referral-v1").update(getUpstreamConfig().apiKey).digest();
}
const b64u = (b: Buffer) => b.toString("base64url");
const mac = (digits: string) => createHmac("sha256", key()).update(digits).digest().subarray(0, 16);

/** US number → 10 digits, or null. Mirrors the platform's normalisation closely enough to match Customer.phone. */
export function phoneDigits(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? ten : null;
}

export function signReferral(phone: string): string | null {
  const d = phoneDigits(phone);
  if (!d) return null;
  return `${b64u(Buffer.from(d))}.${b64u(mac(d))}`;
}

/** The referrer's phone (E.164) for a token, or null if malformed or tampered. */
export function verifyReferral(token: string): string | null {
  const [p, m] = token.split(".");
  if (!p || !m) return null;
  let digits: string;
  let given: Buffer;
  try {
    digits = Buffer.from(p, "base64url").toString();
    given = Buffer.from(m, "base64url");
  } catch {
    return null;
  }
  if (!/^\d{10}$/.test(digits)) return null;
  const want = mac(digits);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return `+1${digits}`;
}

export async function setReferralCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(REF_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: REF_MAX_AGE });
}

/** The referrer's phone from the visitor's cookie, verified, or null. */
export async function readReferral(): Promise<string | null> {
  const jar = await cookies();
  const t = jar.get(REF_COOKIE)?.value;
  return t ? verifyReferral(t) : null;
}

export async function clearReferralCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(REF_COOKIE);
}
