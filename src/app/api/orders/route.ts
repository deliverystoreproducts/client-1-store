import * as api from "@/lib/kamui/client";
import { toPublicOrderSummary } from "@/lib/kamui/map";
import { fail, failFromUpstream, json } from "@/lib/http";
import { readCustomerToken } from "@/lib/session";

/** GET /api/orders — the signed-in customer's order history (keyset-paged). */

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const token = await readCustomerToken();
  if (!token) return fail(401, "not_authenticated", { message: "Please sign in." });

  const sp = new URL(req.url).searchParams;
  const limitRaw = Number(sp.get("limit"));
  const cursorRaw = Number(sp.get("cursor"));

  try {
    const res = await api.listMyOrders(token, {
      limit: Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(50, limitRaw) : 20,
      ...(Number.isInteger(cursorRaw) && cursorRaw > 0 ? { cursor: cursorRaw } : {}),
    });
    return json({
      orders: (res.orders ?? []).map(toPublicOrderSummary),
      nextCursor: res.nextCursor ?? null,
    });
  } catch (e) {
    return failFromUpstream(e, "We couldn't load your orders.");
  }
}
