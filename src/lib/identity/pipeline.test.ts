import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * End-to-end for the vendor-free path: a real PDF417 image goes in, a verdict
 * comes out. The barcode is generated here with zxing's writer rather than
 * checked in as a fixture, so the test exercises actual decoding of actual
 * pixels — the step most likely to break silently on a dependency bump.
 */

const require = createRequire(import.meta.url);

/** Same layout quirk as the reader: the binary lives at the package root's
 *  `dist/writer/`, not beside whichever entry point resolved. */
async function readWriterWasm(): Promise<Buffer> {
  let dir = path.dirname(require.resolve("zxing-wasm/writer"));
  for (let up = 0; up < 6; up += 1) {
    try {
      return await readFile(path.join(dir, "dist", "writer", "zxing_writer.wasm"));
    } catch {
      dir = path.dirname(dir);
    }
  }
  throw new Error("zxing_writer.wasm not found");
}

async function pdf417Jpeg(payload: string): Promise<Uint8Array> {
  const writer = await import("zxing-wasm/writer");
  const wasm = await readWriterWasm();
  writer.prepareZXingModule({
    overrides: { wasmBinary: wasm.buffer as ArrayBuffer },
    fireImmediately: true,
  });
  const written = await writer.writeBarcode(payload, { format: "PDF417", scale: 4 });
  return new Uint8Array(await written.image!.arrayBuffer());
}

function card(dob: string, expiry = "08152030"): string {
  return [
    "@",
    "",
    "\rANSI 636014040002DL00410278ZC03190008DLDAQY1234567",
    "DCSDOE",
    "DACJOHN",
    `DBB${dob}`,
    `DBA${expiry}`,
    "DAJCA",
    "DCGUSA",
    "\r",
  ].join("\n");
}

// A one-pixel JPEG, for the "front" slot the barcode path never reads.
const BLANK_JPEG = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9,
]);

describe("verifyId — barcode provider on real images", () => {
  let verifyId: typeof import("./index").verifyId;

  beforeAll(async () => {
    ({ verifyId } = await import("./index"));
  });

  const front = { bytes: BLANK_JPEG, mimeType: "image/jpeg" };
  const now = new Date("2026-08-23T12:00:00Z");

  it("verifies an adult from a genuine barcode image", async () => {
    const bytes = await pdf417Jpeg(card("03151990"));
    const verdict = await verifyId(
      { front, back: { bytes, mimeType: "image/png" } },
      { minAge: 21, now },
    );
    expect(verdict.status).toBe("verified");
    expect(verdict.status === "verified" && verdict.age).toBe(36);
    expect(verdict.status === "verified" && verdict.method).toBe("barcode");
  }, 30_000);

  it("rejects an underage cardholder", async () => {
    const bytes = await pdf417Jpeg(card("08242005")); // turns 21 on 2026-08-24
    const verdict = await verifyId(
      { front, back: { bytes, mimeType: "image/png" } },
      { minAge: 21, now },
    );
    expect(verdict.status).toBe("rejected");
    expect(verdict.status === "rejected" && verdict.reason).toBe("underage");
  }, 30_000);

  it("rejects an expired licence", async () => {
    const bytes = await pdf417Jpeg(card("03151990", "08152020"));
    const verdict = await verifyId(
      { front, back: { bytes, mimeType: "image/png" } },
      { minAge: 21, now },
    );
    expect(verdict.status).toBe("rejected");
    expect(verdict.status === "rejected" && verdict.reason).toBe("expired");
  }, 30_000);

  it("asks for review — never refuses — when the image holds no barcode", async () => {
    const verdict = await verifyId(
      { front, back: { bytes: BLANK_JPEG, mimeType: "image/jpeg" } },
      { minAge: 21, now },
    );
    expect(verdict.status).toBe("review");
  }, 30_000);

  it("asks for review when the barcode is not a licence", async () => {
    const bytes = await pdf417Jpeg("LOYALTY-CARD-99213");
    const verdict = await verifyId(
      { front, back: { bytes, mimeType: "image/png" } },
      { minAge: 21, now },
    );
    expect(verdict.status).toBe("review");
  }, 30_000);
});
