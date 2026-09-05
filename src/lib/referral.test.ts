// REF-01 — the share-link token: opaque, signed, round-trips to an E.164 phone.
import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/kamui/env", () => ({ getUpstreamConfig: () => ({ apiKey: "kak_test_key", baseUrl: "https://x", timeoutMs: 1000 }) }));
import { signReferral, verifyReferral, phoneDigits } from "@/lib/referral";

describe("referral token", () => {
  it("round-trips a phone in any common format to E.164", () => {
    for (const p of ["(760) 802-9379", "760-802-9379", "+1 760 802 9379", "17608029379", "7608029379"]) {
      const t = signReferral(p);
      expect(t).toBeTruthy();
      expect(verifyReferral(t!)).toBe("+17608029379");
    }
  });
  it("never puts the number in the token in the clear", () => {
    expect(signReferral("7608029379")).not.toContain("7608029379");
  });
  it("rejects a tampered token", () => {
    const t = signReferral("7608029379")!;
    const [p, m] = t.split(".") as [string, string];
    const other = Buffer.from("7608029370").toString("base64url");
    expect(verifyReferral(`${other}.${m}`)).toBeNull();
    expect(verifyReferral(`${p}.${m.slice(0, -2)}AA`)).toBeNull();
    expect(verifyReferral("garbage")).toBeNull();
    expect(verifyReferral("")).toBeNull();
  });
  it("refuses a number that is not 10 US digits", () => {
    expect(signReferral("12345")).toBeNull();
    expect(phoneDigits("+44 20 7946 0958")).toBeNull();
  });
});
