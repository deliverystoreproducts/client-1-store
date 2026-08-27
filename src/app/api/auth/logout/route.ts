import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { fail, json } from "@/lib/http";
import { clearSession, readCustomerToken } from "@/lib/session";

/**
 * POST /api/auth/logout.
 *
 * The real logout is us deleting the cookie — upstream tokens are stateless and
 * there is no server session to revoke. We still notify upstream, best effort,
 * so that the day it gains revocation this route already calls it. A failure
 * there must not stop us clearing the cookie.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const token = await readCustomerToken();
  await clearSession();

  if (token) {
    try {
      await api.logoutUpstream(token);
    } catch {
      /* cookie is already gone; the user is signed out either way */
    }
  }

  return json({ status: "signed_out" });
}
