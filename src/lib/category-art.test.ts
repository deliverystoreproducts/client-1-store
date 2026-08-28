import { describe, expect, it } from "vitest";
import { categoryIconFor } from "./category-art";

describe("categoryIconFor — the YB menu's category names all land on an icon", () => {
  const cases: [string, string][] = [
    ["Flower", "flower"],
    ["Big Buds", "flower"],
    ["Pre Roll", "pre-roll"],
    ["Joints", "pre-roll"],
    ["Infused Pre Roll", "infused-pre-roll"],
    ["Infused Joints", "infused-pre-roll"],
    ["Vape Pens", "vape-pens"],
    ["Disposable", "vape-pens"],
    ["Concentrates", "concentrates"],
    ["Edibles", "edibles"],
    ["Drinks", "drinks"],
    ["Wellness", "tincture"],
    ["Gear", "gear"],
    ["Cultivation", "cultivation"],
  ];
  for (const [name, icon] of cases) {
    it(`${name} → ${icon}`, () => expect(categoryIconFor(name)).toBe(icon));
  }

  it("infused beats pre-roll, whatever the word order", () => {
    expect(categoryIconFor("Pre-Rolls (Infused)")).toBe("infused-pre-roll");
  });

  it("gives up honestly on a name it does not know", () => {
    expect(categoryIconFor("Mystery Box")).toBeNull();
    expect(categoryIconFor("")).toBeNull();
    expect(categoryIconFor(null)).toBeNull();
  });
});
