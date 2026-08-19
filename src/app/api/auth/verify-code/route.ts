import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { normalizePhoneInput } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { setCustomerSession, setPendingSession } from "@/lib/session";

/**
 * POST /api/auth/verify-code — exchange the SMS code for a session.
 *
 * The token returned by the backend is intercepted here and written into an
 * httpOnly cookie. It is NEVER put in the response body: a token in JSON is a
 * token in JavaScript's reach, and this one authorises placing orders.
 *
 * Two outcomes:
 *   - known phone   -> a full customer token   -> `signed_in`
 *   - unknown phone -> a short-lived verified-phone token, good only for
 *                      /api/auth/register    -> `needs_profile`
 * The two are stored under the same cookie name but flagged apart, so a
 * half-finished signup can never be mistaken for a session.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const body = await readJson<{ phone?: unknown; code?: unknown }>(req);
  const phone = normalizePhoneInput(body?.phone);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!phone || !code) {
    return fail(400, "invalid_request", { message: "Enter the code we sent you." });
  }

  // Brute-force guard on the code itself.
  const limited = rateLimit(clientKey(req, "verify-code"), 12, 10 * 60_000);
  if (!limited.ok) {
    return json(
      { error: "rate_limited", message: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  try {
    const res = await api.verifyLoginCode(phone, code);

    if ("customer" in res) {
      await setCustomerSession(res.token);
      return json({ status: "signed_in", customer: toPublicCustomer(res.customer) });
    }

    await setPendingSession(res.token);
    return json({ status: "needs_profile" });
  } catch (e) {
    return failFromUpstream(e, "That code didn't work. Please try again.");
  }
}
