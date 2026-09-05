import { NextResponse } from "next/server";
import * as api from "@/lib/kamui/client";

/** GET /api/push/config — { enabled, publicKey, rewardPercent } for the browser to subscribe with (PUSH-WEB-01 / APP-REWARD-01). */
export const dynamic = "force-dynamic";
export async function GET(): Promise<Response> {
  try {
    const c = await api.pushConfig();
    return NextResponse.json(c, { headers: { "cache-control": "public, max-age=300" } });
  } catch {
    return NextResponse.json({ enabled: false, publicKey: null, rewardPercent: 0 });
  }
}
