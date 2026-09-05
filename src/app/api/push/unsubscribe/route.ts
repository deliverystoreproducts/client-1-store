import { NextResponse } from "next/server";
import * as api from "@/lib/kamui/client";

/** POST /api/push/unsubscribe — the visitor turned notifications off (PUSH-WEB-01). Always 204. */
export const dynamic = "force-dynamic";
export async function POST(req: Request): Promise<Response> {
  try {
    const b = (await req.json()) as { endpoint?: unknown };
    if (typeof b.endpoint === "string") await api.pushUnsubscribe(b.endpoint.slice(0, 2048));
  } catch { /* swallowed */ }
  return new NextResponse(null, { status: 204 });
}
