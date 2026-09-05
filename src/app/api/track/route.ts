import { NextResponse } from "next/server";
import { trackEvent } from "@/lib/kamui/client";
import { readCustomerToken } from "@/lib/session";

/**
 * POST /api/track — same-origin relay for first-party usage events (ANALYTICS-01).
 *
 * The browser posts here (sendBeacon, no cookies needed beyond our own); this
 * forwards ONE event to the platform's store API with the shop's key and, when
 * the shopper is signed in, their customer token — so the platform can attach
 * the customer without the browser ever holding the key or naming the platform.
 *
 * Always 204. A tracker must never fail a page: bad input, a crawler, an
 * upstream outage — all end here, silently.
 */
export const dynamic = "force-dynamic";

const EVENTS = new Set([
  "page_view", "product_view", "add_to_cart", "cart_view", "checkout_start",
  "checkout_phone", "checkout_otp", "checkout_register", "order_placed", "search",
]);
// Crawlers execute our JS now that the store is indexable; their "visits" would
// swamp the funnel. Not security — just keeping the numbers about people.
const BOT_UA = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime/i;
const MAX_BODY = 16 * 1024;

export async function POST(req: Request): Promise<Response> {
  const done = new NextResponse(null, { status: 204 });
  try {
    if (BOT_UA.test(req.headers.get("user-agent") || "")) return done;
    const text = await req.text();
    if (!text || text.length > MAX_BODY) return done;
    const b = JSON.parse(text) as Record<string, unknown>;
    if (typeof b.event !== "string" || !EVENTS.has(b.event)) return done;
    if (typeof b.visitorId !== "string" || typeof b.sessionId !== "string") return done;
    const customerToken = (await readCustomerToken()) ?? undefined;
    await trackEvent(
      {
        visitorId: b.visitorId.slice(0, 128),
        sessionId: b.sessionId.slice(0, 128),
        event: b.event,
        page: typeof b.page === "string" ? b.page.slice(0, 512) : null,
        productId: typeof b.productId === "number" && Number.isInteger(b.productId) && b.productId > 0 ? b.productId : null,
        meta: b.meta && typeof b.meta === "object" ? (b.meta as Record<string, unknown>) : null,
      },
      customerToken,
    );
  } catch {
    /* swallowed by design */
  }
  return done;
}
