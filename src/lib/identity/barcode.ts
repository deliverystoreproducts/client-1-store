import "server-only";

import { checkAamva } from "./aamva";
import { decodePdf417 } from "./decode";
import type { IdentityProvider, IdVerdict } from "./types";

/**
 * The default check: read the PDF417 barcode on the back of the licence and
 * believe the date of birth the DMV encoded there.
 *
 * This costs nothing, sends the customer's identity document to nobody, and
 * answers the question that actually decides whether an order is deliverable
 * ("is this person 21, and is the card still valid?"). What it cannot do is
 * tell a real card from a good forgery — for that a licensee configures a
 * verification vendor (./veriff.ts) and this becomes the fast pre-screen in
 * front of it.
 *
 * Every failure to READ is a "review", never a refusal. A customer whose
 * barcode is scratched, or who holds a passport with no PDF417 at all, is not
 * evidence of anything except a photo we could not parse.
 */
export const barcodeProvider: IdentityProvider = {
  name: "barcode",

  async verify({ back, minAge, now }): Promise<IdVerdict> {
    const payload = await decodePdf417(back.bytes, back.mimeType);
    if (!payload) {
      return { status: "review", reason: "no_barcode" };
    }

    const check = checkAamva(payload, minAge, now);
    if (check.ok) {
      return { status: "verified", age: check.age, method: "barcode" };
    }
    if (check.reason === "underage") {
      return { status: "rejected", reason: "underage", age: check.age };
    }
    if (check.reason === "expired") {
      return { status: "rejected", reason: "expired", age: check.age };
    }
    // Decoded something, but it wasn't an AAMVA licence — a loyalty card, a
    // shipping label. Not a refusal; a human should look.
    return { status: "review", reason: "not_a_licence" };
  },
};
