import { NextResponse } from "next/server";
import * as api from "@/lib/kamui/client";
import { readCustomerToken } from "@/lib/session";
import { signReferral } from "@/lib/referral";

/**
 * GET /api/referral/link — the signed-in customer's own share link (REF-01).
 * Signs THEIR phone (from the platform, never from the client) into a token.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const token = await readCustomerToken();
  if (!token) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  try {
    const me = await api.getMe(token);
    const t = signReferral(me.customer.phone);
    if (!t) return NextResponse.json({ error: "no_phone" }, { status: 400 });
    const origin = (process.env.SITE_ORIGIN || "https://yb13.online").replace(/\/$/, "");
    return NextResponse.json({ url: `${origin}/r/${t}`, code: t.split(".")[0] }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
