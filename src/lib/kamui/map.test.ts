import { describe, expect, it } from "vitest";
import { toPublicCoupon, toPublicDeal } from "@/lib/kamui/map";
import type { StoreCouponV1, StoreDealV1 } from "@/lib/kamui/types";

/**
 * map.ts is the ONLY sanctioned crossing point from wire types to what the
 * browser sees. These tests cover the two crossings where the wire row carries
 * something the browser must not receive.
 */

function couponRow(over: Partial<StoreCouponV1> = {}): StoreCouponV1 {
  return {
    id: 7,
    tenantId: "tnt_abc123",
    code: "SAVE10",
    type: "percent",
    value: 10,
    phone: "+13105550142",
    source: "referral",
    // This is the real shape the platform writes for a referral coupon.
    note: "Referral reward: Dana Whitfield (+13105550199) ordered",
    used: false,
    reusable: false,
    useCount: 0,
    targeting: null,
    expiresAt: "2026-12-31T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("toPublicCoupon", () => {
  it("never carries the note — it names a DIFFERENT customer", () => {
    // The single most important assertion in this file. A referral coupon's
    // note holds the referred person's name and phone number; serving it to the
    // wallet would disclose one customer's identity to another.
    const pub = toPublicCoupon(couponRow());
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain("Dana Whitfield");
    expect(serialized).not.toContain("3105550199");
    expect(serialized).not.toContain("Referral reward:");
    expect("note" in pub).toBe(false);
  });

  it("drops the tenant id and the phone", () => {
    const pub = toPublicCoupon(couponRow());
    const serialized = JSON.stringify(pub);
    expect(serialized).not.toContain("tnt_abc123");
    expect(serialized).not.toContain("3105550142");
  });

  it("still tells the customer where the coupon came from", () => {
    // Dropping the note must not cost the customer the provenance — that is
    // what `label` is for, derived from the source column instead.
    expect(toPublicCoupon(couponRow({ source: "referral" })).label).toBe("Referral reward");
    expect(toPublicCoupon(couponRow({ source: "quiz" })).label).toBe("Strain quiz");
    expect(toPublicCoupon(couponRow({ source: "promo_420" })).label).toBe("4/20 promo");
  });

  it("falls back to a neutral label for a source it does not know", () => {
    expect(toPublicCoupon(couponRow({ source: "some_new_campaign" })).label).toBe("Offer");
  });

  it("reports THAT a coupon is targeted, never to what", () => {
    const targeted = toPublicCoupon(couponRow({ targeting: { brandIds: [4, 9] } }));
    expect(targeted.targeted).toBe(true);
    expect(JSON.stringify(targeted)).not.toContain("brandIds");
    expect(toPublicCoupon(couponRow({ targeting: null })).targeted).toBe(false);
  });

  it("marks an auto-applied promo so the UI can say it needs no tapping", () => {
    expect(toPublicCoupon(couponRow(), true).autoApplied).toBe(true);
    expect(toPublicCoupon(couponRow()).autoApplied).toBe(false);
  });

  it("coerces a junk value rather than rendering NaN at a customer", () => {
    expect(toPublicCoupon(couponRow({ value: "x" as unknown as number })).value).toBe(0);
  });
});

function dealRow(over: Partial<StoreDealV1> = {}): StoreDealV1 {
  return {
    id: 3,
    name: "Two for Tuesday",
    type: "bundle",
    rules: { matchBy: "brand", matchId: 12, maxPrice: 60 },
    active: true,
    startsAt: null,
    expiresAt: "2026-09-01T00:00:00.000Z",
    image: null,
    video: null,
    description: "Any two eighths.",
    ...over,
  };
}

describe("toPublicDeal", () => {
  it("does not carry the rules across", () => {
    // rules.matchId names ids in the PLATFORM's id space. Resolving them here
    // matches nothing, silently — so the UI is never given the chance to try.
    const pub = toPublicDeal(dealRow());
    expect("rules" in pub).toBe(false);
    expect(JSON.stringify(pub)).not.toContain("matchId");
  });

  it("refuses a foreign image host rather than hot-linking it", () => {
    // The proxy's allow-list is what keeps a visitor's IP off a supplier CDN.
    expect(toPublicDeal(dealRow({ image: "https://evil.example.com/a.jpg" })).image).toBeNull();
  });

  it("keeps the expiry only so the UI can say 'ends Friday'", () => {
    expect(toPublicDeal(dealRow()).endsAt).toBe("2026-09-01T00:00:00.000Z");
  });
});
