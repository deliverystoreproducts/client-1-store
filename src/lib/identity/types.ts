/**
 * What an ID check can conclude, and who can conclude it.
 *
 * THE HONEST FRAME, because it governs every decision in this folder: under
 * 4 CCR § 15413 the legally operative check is the driver examining the
 * physical card at the door. Nothing here replaces that. What this does is
 * refuse the orders that were never going to be deliverable — an underage
 * customer, an expired licence — before a driver spends a trip on them, and
 * leave a record of having looked.
 *
 * So the verdicts are deliberately three, not two. "review" is not a failure
 * mode to be engineered away; it is the correct answer whenever the evidence
 * does not support a decision, and it must never harden into a refusal.
 */

export type IdVerdict =
  /** Evidence supports the age claim. `method` says how much that is worth. */
  | {
      status: "verified";
      age: number;
      /**
       * `barcode` — the card's own machine-readable data said so. Real data,
       * no authenticity guarantee (a counterfeit can carry a valid barcode).
       * `vendor` — a verification service also judged the card genuine.
       */
      method: "barcode" | "vendor";
      /** The vendor's session id, for audit. Never an image. */
      reference?: string;
    }
  /** Could not decide. The account proceeds; a human looks at the photo. */
  | { status: "review"; reason: string }
  /** Decided against. The account is refused. */
  | { status: "rejected"; reason: "underage" | "expired" | "fraud"; age?: number };

export interface IdImages {
  front: { bytes: Uint8Array; mimeType: string };
  back: { bytes: Uint8Array; mimeType: string };
}

export interface IdentityProvider {
  readonly name: string;
  verify(input: IdImages & { minAge: number; now: Date }): Promise<IdVerdict>;
}
