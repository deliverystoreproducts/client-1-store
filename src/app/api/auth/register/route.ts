import { isSameOriginRequest } from "@/lib/csrf";
import * as api from "@/lib/kamui/client";
import { toPublicCustomer } from "@/lib/kamui/map";
import { fail, failFromUpstream, json } from "@/lib/http";
import { MAX_ID_IMAGE_BYTES } from "@/lib/identity";
import { clearSession, readPendingToken, setCustomerSession } from "@/lib/session";

/**
 * POST /api/auth/register — finish signup for a phone that just verified.
 *
 * Authenticated by the SHORT-LIVED verified-phone token from verify-code, which
 * we hold in the same httpOnly cookie flagged as `pending`. A full customer
 * session cannot reach this route and a pending one cannot reach any other:
 * that separation is the whole point of the flag.
 *
 * Multipart, because stores that verify identity need photographs of the
 * licence — `idFront` and `idBack`. THE BACK IS WHY THERE ARE TWO: the front
 * is what a person recognises, but the PDF417 barcode on the back is the only
 * machine-readable part, and reading it is the difference between collecting a
 * photo and checking an ID (see lib/identity).
 *
 * The check runs HERE, before Kamui is asked to create anything, so an
 * underage or expired licence never becomes a customer record. It is
 * deliberately fail-open in every other direction: a photo we cannot read, a
 * vendor that is down, a bug in our own code — all of those create the account
 * and leave `idVerified` false for a human to settle. The legally operative
 * check is still the driver examining the physical card at the door.
 *
 * Only the FRONT is forwarded to Kamui for the store's record. The back is
 * used for the barcode and then dropped: it is the densest personal data on
 * the card (address, licence number, full birth date in machine-readable
 * form), and there is no reason to hold a copy once it has been read.
 */

export const dynamic = "force-dynamic";

/** A one-line reason for the customer, per refusal. Deliberately not chatty:
 *  someone probing with forged cards learns nothing from these. */
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

  if (!name) return fail(400, "name_required", { message: "Please enter your name." });
  if (name.length > 120) return fail(400, "name_too_long", { message: "That name is too long." });

  // One photo of the ID, optional here (the checkout asks for it when the
  // store requires one and none is on file). Any image type: an iPhone sends
  // HEIC, and the platform transcodes it — refusing non-JPEG bytes here was
  // why photos "never saved" for iPhone customers.
  const rawPhoto = form.get("idPhoto") ?? form.get("idFront");
  const idPhoto =
    rawPhoto instanceof File && rawPhoto.size > 0 && rawPhoto.size <= MAX_ID_IMAGE_BYTES
      ? rawPhoto
      : null;
  if (rawPhoto instanceof File && rawPhoto.size > MAX_ID_IMAGE_BYTES) {
    return fail(413, "too_large", { message: "That photo is too large — 10 MB at most." });
  }
  try {
    const res = await api.registerCustomer(pendingToken, { name, address, idPhoto });
    await setCustomerSession(res.token);
    return json({ status: "signed_in", customer: toPublicCustomer(res.customer) });
  } catch (e) {
    // A rejected verified-phone token is spent or expired; drop it so the UI
    // sends the user back to the start instead of looping on a dead token.
    await clearSession();
    return failFromUpstream(e, "We couldn't finish creating your account.");
  }
}
