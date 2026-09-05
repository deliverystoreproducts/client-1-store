import { NextResponse } from "next/server";
import { setReferralCookie, verifyReferral } from "@/lib/referral";

/**
 * GET /r/<token> — a friend's referral link (REF-01).
 *
 * Verifies the token, remembers the referrer in a cookie for 30 days, and
 * sends the visitor to the store. A bad token still lands on the store — a
 * broken link must never be a dead end for someone who came to buy.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await ctx.params;
  if (verifyReferral(token)) await setReferralCookie(token);
  return NextResponse.redirect(new URL("/", process.env.SITE_ORIGIN || "https://yb13.online"), 302);
}
