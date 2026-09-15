import { describe, expect, it } from "vitest";
import { citySlug } from "./city-slug";

describe("GEO-01: citySlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(citySlug("Huntington Beach")).toBe("huntington-beach");
    expect(citySlug("Rancho Cucamonga")).toBe("rancho-cucamonga");
  });
  it("keeps an existing hyphen as one hyphen", () => {
    expect(citySlug("Arden-Arcade")).toBe("arden-arcade");
  });
  it("strips accents and punctuation, trims stray hyphens", () => {
    expect(citySlug("  Cañon City ")).toBe("canon-city");
    expect(citySlug("St. Helena")).toBe("st-helena");
  });
  it("is stable for the same city written differently", () => {
    expect(citySlug("SACRAMENTO")).toBe(citySlug("Sacramento"));
  });
});
