import { NextResponse } from "next/server";
import * as api from "@/lib/kamui/client";
import { readCustomerToken } from "@/lib/session";

/**
 * POST /api/push/subscribe — relay the browser's PushSubscription to the
 * platform with the store key and, when signed in, the customer token
 * (PUSH-WEB-01). The browser never holds the key or names the platform.
 */
export const dynamic = "force-dynamic";
export async function POST(req: Request): Promise<Response> {
  let b: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; visitorId?: unknown } = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  if (typeof b.endpoint !== "string" || typeof b.keys?.p256dh !== "string" || typeof b.keys?.auth !== "string") {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }
  try {
    const token = (await readCustomerToken()) ?? undefined;
    await api.pushSubscribe(
      {
        endpoint: b.endpoint.slice(0, 2048),
        keys: { p256dh: b.keys.p256dh.slice(0, 512), auth: b.keys.auth.slice(0, 256) },
        visitorId: typeof b.visitorId === "string" ? b.visitorId.slice(0, 128) : null,
        userAgent: (req.headers.get("user-agent") || "").slice(0, 512) || null,
      },
      token,
    );
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
}
