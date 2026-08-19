import * as api from "@/lib/kamui/client";
import { toPublicTracking } from "@/lib/kamui/map";
import { fail, json } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/orders/track/:token — delivery status.
 *
 * The token in the path IS the capability; no sign-in is involved, by design,
 * because the link travels by SMS and gets opened on whatever device is handy.
 * That also means it gets forwarded, so the payload deliberately carries no line
 * items and no money — see `PublicTracking`.
 *
 * Throttled: an unauthenticated lookup keyed on a secret is exactly the shape
 * you would try to enumerate.
 */

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  if (!token || token.length < 8 || token.length > 128) {
    return fail(404, "not_found", { message: "We couldn't find that order." });
  }

  const limited = rateLimit(clientKey(req, "track"), 60, 10 * 60_000);
  if (!limited.ok) {
    return json(
      { error: "rate_limited", message: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  try {
    return json(toPublicTracking(await api.trackOrder(token)));
  } catch {
    // Any failure is a 404. Distinguishing "no such token" from "backend down"
    // would turn this route into an oracle for guessing tokens.
    return fail(404, "not_found", { message: "We couldn't find that order." });
  }
}
