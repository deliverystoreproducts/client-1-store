import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { UpstreamError } from "@/lib/kamui/errors";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { normalizePhoneInput } from "@/lib/phone";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { readCustomerToken } from "@/lib/session";

/**
 * The Spin & Save wheel, BFF-side.
 *
 * GET  — the wheel's face (segment labels) + whether this customer already
 *        played. Sends the session token when there is one, so a signed-in
 *        customer who already spun never sees the modal at all.
 * POST — the actual spin. A signed-in customer spins on their session; a guest
 *        spins with phone + the one-time code (the code was sent through the
 *        existing /api/auth/send-code flow — same throttles, same provider).
 *
 * The PRIZE TABLE never appears here. It lives server-side upstream, and only
 *  the label list crosses — a client that could see the weights could work out
 * whether a spin is worth a phone number, and one that could name its own
 * prize would hand out discounts on demand.
 */

export const dynamic = "force-dynamic";

const PER_CLIENT = { limit: 10, windowMs: 10 * 60_000 };
const PER_PHONE = { limit: 6, windowMs: 10 * 60_000 };

export async function GET(): Promise<Response> {
  try {
    const token = await readCustomerToken();
    const status = await api.getSpinStatus(token);
    return json(
      {
        spun: !!status.spun,
        signedIn: !!token,
        segments: (status.segments ?? []).map((s) => ({ label: s.label })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failFromUpstream(e, "The wheel isn't available right now.");
  }
}

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const limited = rateLimit(clientKey(req, "spin"), PER_CLIENT.limit, PER_CLIENT.windowMs);
  if (!limited.ok) {
    return json(
      { error: "rate_limited", message: "Too many tries. Give it a few minutes." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await readJson<{ phone?: unknown; code?: unknown }>(req);
  const token = await readCustomerToken();

  let payload: { phone?: string; code?: string } = {};
  if (!token) {
    const phone = normalizePhoneInput(body?.phone);
    if (!phone) return fail(400, "invalid_phone", { message: "Enter a valid mobile number." });
    const byPhone = rateLimit(`spin:phone:${phone}`, PER_PHONE.limit, PER_PHONE.windowMs);
    if (!byPhone.ok) {
      return json(
        { error: "rate_limited", message: "Too many tries. Give it a few minutes." },
        { status: 429, headers: { "Retry-After": String(byPhone.retryAfterSeconds) } },
      );
    }
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    payload = code ? { phone, code } : { phone };
  }

  try {
    const result = await api.postSpin(payload, token);
    return json({
      label: result.prize,
      segmentIndex: result.segmentIndex,
      couponCode: result.couponCode,
    });
  } catch (e) {
    // The three states a player can actually act on get their own names; the
    // generic mapper would flatten them into "unavailable" and strand the flow.
    if (e instanceof UpstreamError) {
      if (e.status === 409) {
        return json({ error: "already_played" }, { status: 409 });
      }
      if (e.status === 401) {
        return json(
          { error: "bad_code", message: "That code didn't match. Check it and try again." },
          { status: 401 },
        );
      }
      if (e.status === 400) {
        return json(
          { error: "invalid_phone", message: "Enter a valid mobile number." },
          { status: 400 },
        );
      }
    }
    return failFromUpstream(e, "The wheel isn't available right now.");
  }
}
