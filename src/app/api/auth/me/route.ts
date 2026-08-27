import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json, readJson } from "@/lib/http";
import { UpstreamError } from "@/lib/kamui/errors";
import { clearSession, readCustomerToken, readSessionToken } from "@/lib/session";
import type { SessionState } from "@/lib/public-types";

/**
 * GET /api/auth/me — who the browser is, without ever telling it the token.
 * PATCH /api/auth/me — update the saved name/address.
 *
 * A pending (phone-verified, no profile) session is reported as
 * `pendingRegistration` and never as authenticated, so the checkout UI can send
 * the user to finish signup instead of failing at the order POST.
 */

export const dynamic = "force-dynamic";

const SIGNED_OUT: SessionState = {
  authenticated: false,
  pendingRegistration: false,
  customer: null,
};

export async function GET(): Promise<Response> {
  const session = await readSessionToken();
  if (!session) return json(SIGNED_OUT);

  if (session.kind === "pending") {
    return json<SessionState>({
      authenticated: false,
      pendingRegistration: true,
      customer: null,
    });
  }

  try {
    const res = await api.getMe(session.token);
    return json<SessionState>({
      authenticated: true,
      pendingRegistration: false,
      customer: toPublicCustomer(res.customer),
    });
  } catch (e) {
    // ONLY a token upstream actually rejected signs the customer out. Anything
    // else — a timeout, a 5xx, a network blip — is a hiccup, and a hiccup must
    // not destroy a session the customer just verified by SMS. (That was the
    // "verified my number and landed back on sign-in" report: the account page
    // asked /me a moment after sign-in, the answer failed for a reason that had
    // nothing to do with the token, and this branch threw the cookie away.)
    if (e instanceof UpstreamError && e.code === "customer_unauthorized") {
      await clearSession();
      return json(SIGNED_OUT);
    }
    console.error("[bff] /api/auth/me could not reach upstream", e);
    return fail(503, "unavailable", {
      message: "We couldn't load your account just now. Please try again.",
    });
  }
}

export async function PATCH(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const token = await readCustomerToken();
  if (!token) return fail(401, "not_authenticated", { message: "Please sign in." });

  const body = await readJson<{ name?: unknown; address?: unknown }>(req);
  const patch: { name?: string; address?: string } = {};
  if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
  if (typeof body?.address === "string") patch.address = body.address.trim().slice(0, 300);
  if (Object.keys(patch).length === 0) {
    return fail(400, "nothing_to_update", { message: "Nothing to update." });
  }

  try {
    const res = await api.updateMe(token, patch);
    return json<SessionState>({
      authenticated: true,
      pendingRegistration: false,
      customer: toPublicCustomer(res.customer),
    });
  } catch (e) {
    return failFromUpstream(e, "We couldn't save that.");
  }
}
