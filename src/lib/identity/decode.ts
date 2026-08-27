import "server-only";

import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * PDF417 decoding, server side.
 *
 * The barcode on the back of a licence is read HERE, never in the browser: a
 * page that decoded its own barcode and posted the result would be asking the
 * customer's device to certify the customer's age, which is not a check at
 * all. The image crosses to this server and the answer is computed from the
 * pixels.
 *
 * The WASM binary is read off local disk rather than the CDN that zxing-wasm
 * reaches for by default — the storefront makes no third-party request from
 * the browser and there is no reason to hold the server to a looser rule.
 * `next.config.ts` traces the .wasm into the standalone bundle.
 */

let modulePromise: Promise<typeof import("zxing-wasm/reader")> | null = null;

/**
 * The binary is not an export path, so it has to be found on disk — and it is
 * NOT a sibling of the entry point. zxing-wasm publishes the entry under
 * `dist/cjs/…` or `dist/es/…` depending on how the consumer imports it, while
 * every .wasm sits at `dist/reader/`. Assuming a sibling silently resolved to
 * a file that never exists, which made every scan fall through to "a human
 * should look" — so walk up to the package root and look there instead.
 */
async function readReaderWasm(): Promise<Buffer> {
  const require = createRequire(import.meta.url);
  let dir = path.dirname(require.resolve("zxing-wasm/reader"));
  for (let up = 0; up < 6; up += 1) {
    try {
      return await readFile(path.join(dir, "dist", "reader", "zxing_reader.wasm"));
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new Error("zxing_reader.wasm not found");
}

async function loadReader() {
  if (!modulePromise) {
    modulePromise = (async () => {
      const reader = await import("zxing-wasm/reader");
      const wasm = await readReaderWasm();
      reader.prepareZXingModule({
        // Slice to exactly the file: a Node Buffer can be a window onto a
        // larger pooled ArrayBuffer, and handing the whole pool to the loader
        // would hand it neighbouring memory instead of a WASM module.
        overrides: {
          wasmBinary: wasm.buffer.slice(
            wasm.byteOffset,
            wasm.byteOffset + wasm.byteLength,
          ) as ArrayBuffer,
        },
        fireImmediately: true,
      });
      return reader;
    })().catch((e) => {
      // A failed load must not poison the cache — the next scan gets a fresh
      // attempt, and meanwhile every caller degrades to human review.
      modulePromise = null;
      throw e;
    });
  }
  return modulePromise;
}

/**
 * Returns the decoded barcode text, or null when nothing readable is present.
 * Never throws: an unreadable photo is an ordinary outcome (a thumb over the
 * barcode, glare, a passport with no PDF417 at all), not an error condition,
 * and the caller turns null into "a human should look at this".
 */
export async function decodePdf417(image: Uint8Array, mimeType: string): Promise<string | null> {
  try {
    const reader = await loadReader();
    const results = await reader.readBarcodesFromImageFile(
      new Blob([image as unknown as BlobPart], { type: mimeType }),
      { formats: ["PDF417"], tryHarder: true, maxNumberOfSymbols: 1 },
    );
    const text = results.find((r) => r.isValid !== false)?.text;
    return text?.length ? text : null;
  } catch (e) {
    console.error("[identity] barcode decode failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
