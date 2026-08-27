import "server-only";

import { barcodeProvider } from "./barcode";
import { veriffConfigured, veriffProvider } from "./veriff";
import type { IdImages, IdVerdict } from "./types";

export type { IdVerdict } from "./types";

/** JPEG only. The capture component re-encodes every photo through a canvas,
 *  so anything else reaching this server did not come from our own page. */
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function looksLikeJpeg(bytes: Uint8Array): boolean {
  return JPEG_MAGIC.every((b, i) => bytes[i] === b);
}

export const MAX_ID_IMAGE_BYTES = MAX_IMAGE_BYTES;

/**
 * Runs the configured check. A vendor, when one is configured and holds the
 * authenticity opinion; otherwise the licence's own barcode.
 *
 * Never throws. Every unexpected condition resolves to "review" — the failure
 * mode of an identity check must be "a person looks at it", never "the
 * customer is turned away because our code broke".
 */
export async function verifyId(
  images: IdImages,
  opts: { minAge: number; now?: Date },
): Promise<IdVerdict> {
  const provider = veriffConfigured() ? veriffProvider : barcodeProvider;
  try {
    return await provider.verify({ ...images, minAge: opts.minAge, now: opts.now ?? new Date() });
  } catch (e) {
    console.error(`[identity] ${provider.name} threw:`, e instanceof Error ? e.message : e);
    return { status: "review", reason: "check_failed" };
  }
}
