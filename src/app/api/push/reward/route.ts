import { NextResponse } from "next/server";
import * as api from "@/lib/kamui/client";
import { readCustomerToken } from "@/lib/session";
import { failFromUpstream } from "@/lib/http";

/**
 * POST /api/push/reward — claim the "add the app + turn on notifications"
 * coupon for the subscription this browser holds (APP-REWARD-01). Needs a
 * signed-in session: the coupon lands on the customer's phone. 401 signed
 * out, 404 when the shop is not running the offer, 409 when the platform has
 * no live subscription for this endpoint and customer.
 */
export const dynamic = "force-dynamic";
export async function POST(req: Request): Promise<Response> {
  const token = await readCustomerToken();
  if (!token) return NextResponse.json({ error: "signin_required" }, { status: 401 });
  let b: { endpoint?: unknown } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (typeof b.endpoint !== "string" || !b.endpoint) {
    return NextResponse.json({ error: "invalid_endpoint" }, { status: 400 });
  }
  try {
    const r = await api.pushReward(b.endpoint.slice(0, 2048), token);
    return NextResponse.json(r);
  } catch (e) {
    return failFromUpstream(e);
  }
}
