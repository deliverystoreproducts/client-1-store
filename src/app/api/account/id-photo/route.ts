import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json } from "@/lib/http";
import { readCustomerToken } from "@/lib/session";
import type { SessionState } from "@/lib/public-types";

/**
 * POST /api/account/id-photo — attach a government-ID photo to the signed-in
 * customer, after the fact.
 *
 * Signup already collects the ID when the store requires one; this is the
 * "I skipped it / the store turned the requirement on later / my licence was
 * renewed" door, reached from the account page. The file goes straight
 * upstream and the browser gets back only the refreshed profile (`hasId`
 * true) — never a URL to the photo.
 */

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const token = await readCustomerToken();
  if (!token) return fail(401, "not_authenticated", { message: "Please sign in." });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "invalid_request", { message: "Choose a photo of your ID." });
  }
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return fail(400, "invalid_request", { message: "Choose a photo of your ID." });
  }
  if (photo.size > MAX_BYTES) {
    return fail(413, "too_large", { message: "That photo is too large — 10 MB at most." });
  }

  try {
    await api.uploadIdPhoto(token, photo);
    const me = await api.getMe(token);
    return json<SessionState>({
      authenticated: true,
      pendingRegistration: false,
      customer: toPublicCustomer(me.customer),
    });
  } catch (e) {
    return failFromUpstream(e, "We couldn't save that photo. Please try again.");
  }
}
