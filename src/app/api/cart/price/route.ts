import { isSameOriginRequest } from "@/lib/csrf";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { readCustomerToken } from "@/lib/session";
import { priceCart, sanitizeCartLines } from "@/lib/store";

/**
 * POST /api/cart/price — authoritative prices for a browser cart.
 *
 * The browser stores ids and quantities only. Prices come from here, resolved in
 * a SINGLE upstream request via `products?ids=1,2,3` — the parameter exists
 * upstream for exactly this, so a cart never has to fan out per line and hope
 * the answers agree with each other.
 *
 * POST rather than GET because a cart can be long and because this must never be
 * cached or land in an access log as a URL.
 */

export const dynamic = "force-dynamic";

interface Body {
  items?: unknown;
  couponCode?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const body = await readJson<Body>(req);
  if (!body) return fail(400, "invalid_request", { message: "Malformed request." });

  const lines = sanitizeCartLines(body.items);
  const couponCode = typeof body.couponCode === "string" ? body.couponCode.slice(0, 64) : null;

  try {
    const customerToken = await readCustomerToken();
    return json(await priceCart(lines, { couponCode, customerToken }));
  } catch (e) {
    return failFromUpstream(e, "We couldn't price your cart right now.");
  }
}
