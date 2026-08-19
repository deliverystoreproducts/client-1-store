import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json } from "@/lib/http";
import { clearSession, readPendingToken, setCustomerSession } from "@/lib/session";

/**
 * POST /api/auth/register — finish signup for a phone that just verified.
 *
 * Authenticated by the SHORT-LIVED verified-phone token from verify-code, which
 * we hold in the same httpOnly cookie flagged as `pending`. A full customer
 * session cannot reach this route and a pending one cannot reach any other:
 * that separation is the whole point of the flag.
 *
 * Multipart, because some stores require a government-ID photo. Whether it is
 * mandatory is the store's setting (`requireIdVerification` on the profile) and
 * the backend enforces it; we just forward the file.
 */

export const dynamic = "force-dynamic";

const MAX_ID_PHOTO_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return fail(403, "forbidden");

  const pendingToken = await readPendingToken();
  if (!pendingToken) {
    return fail(401, "not_verified", { message: "Verify your phone number first." });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail(400, "invalid_request", { message: "Malformed request." });
  }

  const name = (form.get("name") as string | null)?.trim() ?? "";
  const address = (form.get("address") as string | null)?.trim() || null;
  const idPhoto = form.get("idPhoto");

  if (!name) return fail(400, "name_required", { message: "Please enter your name." });
  if (name.length > 120) return fail(400, "name_too_long", { message: "That name is too long." });

  let file: File | null = null;
  if (idPhoto instanceof File && idPhoto.size > 0) {
    if (idPhoto.size > MAX_ID_PHOTO_BYTES) {
      return fail(400, "id_too_large", { message: "That photo is too large (20MB max)." });
    }
    if (!idPhoto.type.startsWith("image/")) {
      return fail(400, "id_not_image", { message: "Please upload a photo of your ID." });
    }
    file = idPhoto;
  }

  try {
    const res = await api.registerCustomer(pendingToken, { name, address, idPhoto: file });
    await setCustomerSession(res.token);
    return json({ status: "signed_in", customer: toPublicCustomer(res.customer) });
  } catch (e) {
    // A rejected verified-phone token is spent or expired; drop it so the UI
    // sends the user back to the start instead of looping on a dead token.
    await clearSession();
    return failFromUpstream(e, "We couldn't finish creating your account.");
  }
}
