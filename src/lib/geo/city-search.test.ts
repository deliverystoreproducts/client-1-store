import { describe, it, expect } from "vitest";
import { answer, suggest, milesBetween } from "./city-search";
import { CA_CITIES } from "./ca-cities";
import type { Pin } from "./tiles";

const pin = (city: string, slug: string): Pin => ({ city, slug, isLocal: false, minimumOrder: 25, freeDelivery: true, lat: CA_CITIES[slug]![0], lng: CA_CITIES[slug]![1] });
const pins = [pin("Anaheim", "anaheim"), pin("Santa Ana", "santa-ana"), pin("Sacramento", "sacramento"), pin("San Bernardino", "san-bernardino"), pin("Fresno", "fresno"), pin("Costa Mesa", "costa-mesa")];

describe("suggest", () => {
  it("offers cities we deliver to, names that START with the text first", () => {
    expect(suggest("sa", pins).map((p) => p.city)).toEqual(["Sacramento", "San Bernardino", "Santa Ana", "Costa Mesa"]);
    expect(suggest("ana", pins).map((p) => p.city)).toEqual(["Anaheim", "Santa Ana"]);
  });
  it("needs two letters, ignores case, spaces and punctuation", () => {
    expect(suggest("s", pins)).toEqual([]);
    expect(suggest("  SANTA  ana ", pins).map((p) => p.city)).toEqual(["Santa Ana"]);
    expect(suggest("zzz", pins)).toEqual([]);
  });
});

describe("answer", () => {
  it("a city we deliver to → its pin, from a full or a partial name", () => {
    expect(answer("Santa Ana", pins)).toMatchObject({ kind: "delivers", pin: { slug: "santa-ana" } });
    expect(answer("fres", pins)).toMatchObject({ kind: "delivers", pin: { slug: "fresno" } });
  });
  it("a real city we do not serve → the closest one we do, with an honest distance", () => {
    const a = answer("Irvine", pins);
    expect(a).toMatchObject({ kind: "nearby", asked: "Irvine" });
    expect(a.kind === "nearby" && a.nearest.slug).toBe("santa-ana"); // 5 miles; Costa Mesa is 6
    expect(a.kind === "nearby" && a.miles).toBeGreaterThanOrEqual(3);
    expect(a.kind === "nearby" && a.miles).toBeLessThanOrEqual(8);
    expect(answer("Redding", pins)).toMatchObject({ kind: "nearby", nearest: { slug: "sacramento" } });
    expect(answer("la mesa", pins)).toMatchObject({ kind: "nearby", asked: "La Mesa" });
  });
  it("something that is not a city we know → says so, never a guess", () => {
    expect(answer("Springfield", pins)).toEqual({ kind: "unknown" });
    expect(answer("x", pins)).toEqual({ kind: "unknown" });
    expect(answer("san", [])).toEqual({ kind: "unknown" });
    // "san" starts many cities we do not serve: ambiguous is unknown, but here it matches ones we DO serve first.
    expect(answer("san", pins)).toMatchObject({ kind: "delivers" });
  });
  it("distance is in miles and about right", () => {
    const la = { lat: 34.05, lng: -118.24 }, sd = { lat: 32.72, lng: -117.16 };
    expect(milesBetween(la, sd)).toBeGreaterThan(105);
    expect(milesBetween(la, sd)).toBeLessThan(120);
  });
});
