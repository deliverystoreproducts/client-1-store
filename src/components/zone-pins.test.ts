import { describe, expect, it } from "vitest";
import { zonePins } from "./DeliveryMapSection";

const zone = (city: string) => ({ city, slug: city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), isLocal: true, minimumOrder: 0, freeDelivery: true });

describe("zonePins", () => {
  it("pins a zone named after one city", () => {
    expect(zonePins([zone("Van Nuys")]).map((p) => p.slug)).toEqual(["van-nuys"]);
  });
  it("pins every known place in a zone that names several, linking each to the zone's page", () => {
    const pins = zonePins([zone("Woodland Hills / Tarzana / Canoga Park")]);
    expect(pins.map((p) => p.city)).toEqual(["Woodland Hills", "Tarzana", "Canoga Park"]);
    expect(new Set(pins.map((p) => p.zoneSlug))).toEqual(new Set(["woodland-hills-tarzana-canoga-park"]));
  });
  it("skips unknown places and never pins one place twice", () => {
    expect(zonePins([zone("Tarzana & Nowhereville"), zone("Tarzana")]).map((p) => p.slug)).toEqual(["tarzana"]);
  });
});
