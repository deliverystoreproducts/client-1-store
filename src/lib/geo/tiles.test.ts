import { describe, it, expect } from "vitest";
import { tileAllowed, tileOf, MIN_ZOOM, MAX_ZOOM } from "./tiles";
import { CA_CITIES } from "./ca-cities";
import { citySlug } from "@/lib/city-slug";

describe("tile relay allow-list", () => {
  it("serves every tile a California city sits on, at every zoom the map uses", () => {
    for (const [slug, [lat, lng]] of Object.entries(CA_CITIES)) {
      for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
        const t = tileOf(lat, lng, z);
        expect(tileAllowed(z, t.x, t.y), `${slug} z${z}`).toBe(true);
      }
    }
  });
  it("fills a wide frame: the ocean and the desert either side of California are served too", () => {
    for (const [lat, lng] of [[36, -130], [36, -108], [45, -120], [28, -115]] as const) {
      const t = tileOf(lat, lng, 6);
      expect(tileAllowed(6, t.x, t.y), `${lat},${lng}`).toBe(true);
    }
  });
  it("is not a tile server for the rest of the world", () => {
    const nyc = tileOf(40.71, -74.0, 10), london = tileOf(51.5, -0.12, 10), tokyo = tileOf(35.68, 139.69, 10);
    for (const t of [nyc, london, tokyo]) expect(tileAllowed(10, t.x, t.y)).toBe(false);
  });
  it("refuses zooms outside the map's range and anything that is not a whole number", () => {
    const la = tileOf(34.05, -118.24, 12);
    expect(tileAllowed(12, la.x, la.y)).toBe(true);
    expect(tileAllowed(MAX_ZOOM + 1, 0, 0)).toBe(false);
    expect(tileAllowed(MIN_ZOOM - 1, 0, 0)).toBe(false);
    expect(tileAllowed(12, la.x + 0.5, la.y)).toBe(false);
    expect(tileAllowed(NaN, 1, 1)).toBe(false);
    expect(tileAllowed(12, -1, la.y)).toBe(false);
  });
  it("knows Los Angeles' tile (a fixed point of the numbering)", () => {
    expect(tileOf(34.05, -118.24, 10)).toEqual({ x: 175, y: 408 });
  });
});

describe("the gazetteer", () => {
  it("is keyed by slug, inside California, and covers every city YB delivers to today", () => {
    for (const [slug, [lat, lng]] of Object.entries(CA_CITIES)) {
      expect(slug).toBe(citySlug(slug));
      expect(lat).toBeGreaterThan(32.4); expect(lat).toBeLessThan(42.1);
      expect(lng).toBeGreaterThan(-124.5); expect(lng).toBeLessThan(-114.0);
    }
    const yb = ["Anaheim", "Arden-Arcade", "Cerritos", "Chino", "Citrus Heights", "Clovis", "Corona", "Costa Mesa", "Fontana", "Fresno", "Fullerton", "Granite Bay",
      "Huntington Beach", "Irvine", "Jurupa Valley", "La Habra", "Newport Beach", "Ontario", "Orange", "Pomona", "Rancho Cucamonga", "Riverside", "Roseville",
      "Sacramento", "San Bernardino", "Santa Ana", "Upland", "Visalia", "Westminster", "Yorba Linda"];
    expect(yb.filter((c) => !CA_CITIES[citySlug(c)])).toEqual([]);
    // HitsLA names its zones by Los Angeles neighbourhood: eight of its fifteen had no pin on the first deploy.
    const hitsla = ["Arcadia", "Burbank", "Encino", "Glendale", "Korea Town", "Mid City", "North Hollywood", "Northridge", "Pasadena",
      "Santa Clarita", "Sherman Oaks", "Sylmar", "Thousand Oaks", "Van Nuys", "Woodland Hills"];
    expect(hitsla.filter((c) => !CA_CITIES[citySlug(c)])).toEqual([]);
  });
});
