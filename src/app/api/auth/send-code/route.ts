import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { normalizePhoneInput } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { setCustomerSession, setPendingSession } from "@/lib/session";

/**
 * POST /api/auth/send-code — start phone sign-in.
 *
 * THROTTLED ON PURPOSE. This route makes the backend send an SMS on our API
 * key's authority; without a limiter it is a paid-message pump. Two buckets:
 * per client and per phone number, because either alone is trivially sidestepped.
 *
 * Upstream normally answers `{ sent: true }`. When a store has OTP switched off
 * it short-circuits and returns a session token immediately — handled here so
 * that configuration does not strand the user on a code screen that will never
 * receive a code.
 */

export const dynamic = "force-dynamic";

const PER_CLIENT = { limit: 8, windowMs: 10 * 60_000 };
const PER_PHONE = { limit: 4, windowMs: 10 * 60_000 };

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const body = await readJson<{ phone?: unknown }>(req);
  const phone = normalizePhoneInput(body?.phone);
  if (!phone) {
    return fail(400, "invalid_phone", { message: "Enter a valid mobile number." });
  }

  const byClient = rateLimit(clientKey(req, "send-code"), PER_CLIENT.limit, PER_CLIENT.windowMs);
  const byPhone = rateLimit(`send-code:phone:${phone}`, PER_PHONE.limit, PER_PHONE.windowMs);
  if (!byClient.ok || !byPhone.ok) {
    const retry = Math.max(byClient.retryAfterSeconds, byPhone.retryAfterSeconds);
    return json(
      { error: "rate_limited", message: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  try {
    const res = await api.sendLoginCode(phone);

    if ("token" in res) {
      // Store has OTP disabled: we already hold a token.
      if ("customer" in res) {
        await setCustomerSession(res.token);
        return json({ status: "signed_in", customer: toPublicCustomer(res.customer) });
      }
      await setPendingSession(res.token);
      return json({ status: "needs_profile" });
    }

    return json({ status: "code_sent" });
  } catch (e) {
    return failFromUpstream(e, "We couldn't send a code right now. Please try again.");
  }
}
