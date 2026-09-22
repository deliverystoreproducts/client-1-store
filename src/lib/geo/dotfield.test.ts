import { describe, it, expect } from "vitest";
import { buildField, gridDots, toXY, GRID } from "./dotfield";
import { DOT_ROWS } from "./dotfield-grid";
import { CA_CITIES } from "./ca-cities";
import type { Pin } from "./tiles";

const pin = (city: string, slug: string): Pin => ({ city, slug, isLocal: false, minimumOrder: 25, freeDelivery: true, lat: CA_CITIES[slug]![0], lng: CA_CITIES[slug]![1] });
const YB = [["Sacramento", "sacramento"], ["Roseville", "roseville"], ["Citrus Heights", "citrus-heights"], ["Fresno", "fresno"], ["Clovis", "clovis"], ["Visalia", "visalia"],
  ["Anaheim", "anaheim"], ["Riverside", "riverside"], ["Irvine", "irvine"], ["Pomona", "pomona"], ["San Bernardino", "san-bernardino"]].map(([c, s]) => pin(c!, s!));

describe("the land mask", () => {
  it("covers the whole design space, row by row, in the three classes only", () => {
    expect(DOT_ROWS.length).toBe(GRID.H / GRID.STEP + 1);
    for (const r of DOT_ROWS) { expect(r.length).toBe(GRID.W / GRID.STEP + 1); expect(r).toMatch(/^[012]+$/); }
  });
  it("puts every California city a shop delivers to on California dots, and the ocean west of it", () => {
    const dots = gridDots();
    const at = (x: number, y: number) => dots.reduce((b, d) => (Math.hypot(d.x - x, d.y - y) < Math.hypot(b.x - x, b.y - y) ? d : b));
    for (const s of ["sacramento", "fresno", "riverside", "san-bernardino", "chino", "visalia"]) {
      const [x, y] = toXY(...CA_CITIES[s]!); expect(at(x, y).t, s).toBe(2);
    }
    expect(at(...toXY(36.5, -127)).t).toBe(0); // Pacific
    expect(at(...toXY(38.5, -117)).t).toBe(1); // Nevada
  });
});

describe("the shop's field", () => {
  const f = buildField(YB);
  it("finds YB's three regions and names them the way a Californian would", () => {
    expect(f.regions.map((r) => [r.name, r.pins.length])).toEqual([["Southern California", 5], ["Sacramento area", 3], ["Central Valley", 3]]);
  });
  it("lights the dots around each delivery city, and only California's", () => {
    const hot = f.dots.filter((d) => d.heat === 2);
    expect(hot.length).toBeGreaterThanOrEqual(15);
    expect(hot.every((d) => d.t === 2)).toBe(true);
    const [fx, fy] = toXY(...CA_CITIES.fresno!);
    const nearFresno = hot.filter((d) => Math.hypot(d.x - fx, d.y - fy) < 12);
    expect(nearFresno.length).toBeGreaterThan(0);
    expect(new Set(nearFresno.map((d) => d.reg)).size).toBe(1);
  });
  it("a shop with no zones is a dark field, not an error", () => {
    const empty = buildField([]);
    expect(empty.regions).toEqual([]);
    expect(empty.dots.some((d) => d.heat)).toBe(false);
  });
});
