import { describe, expect, it } from "vitest";
import { BRAND_LOGO_COUNT, brandLogoUrl, normalizeBrandName } from "./brand-art";

describe("normalizeBrandName", () => {
  it("drops trademark marks, punctuation, a leading 'the', and case", () => {
    expect(normalizeBrandName("PLUGPLAY™")).toBe("plugplay");
    expect(normalizeBrandName("Dab Daddy Ⓡ")).toBe("dab daddy");
    expect(normalizeBrandName("The Cake House")).toBe("cake house");
    expect(normalizeBrandName("CBX: Cannabiotix")).toBe("cbx cannabiotix");
    expect(normalizeBrandName("Papa & Barkley")).toBe("papa and barkley");
    expect(normalizeBrandName("Not Your Father's")).toBe("not your father s");
  });
});

describe("brandLogoUrl", () => {
  it("returns null for an unknown or empty name", () => {
    expect(brandLogoUrl("definitely not a brand 12345")).toBeNull();
    expect(brandLogoUrl("")).toBeNull();
    expect(brandLogoUrl(null)).toBeNull();
  });

  it("only ever points at images.weedmaps.com, square-cropped", () => {
    // Skipped until the table is generated (scripts/build-brand-logos.mjs).
    if (BRAND_LOGO_COUNT === 0) return;
    for (const name of ["STIIIZY", "West Coast Cure", "Raw Garden", "Jeeter"]) {
      const url = brandLogoUrl(name);
      if (!url) continue;
      expect(url.startsWith("https://images.weedmaps.com/")).toBe(true);
      expect(url).toContain("w=400&h=400&fit=crop");
    }
  });
});
