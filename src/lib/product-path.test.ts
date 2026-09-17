import { describe, it, expect } from "vitest";
import { productIdFromParam, productPath, productSlug } from "./product-path";

describe("product URLs (BLOG-01)", () => {
  it("builds <slug>-<id> from the name", () => {
    expect(productPath({ id: 300000123, name: "Wedding Cake 3.5g" })).toBe("/product/wedding-cake-3-5g-300000123");
    expect(productPath({ id: 7, name: "Crème Brûlée!" })).toBe("/product/creme-brulee-7");
  });
  it("falls back to the bare id when the name has nothing usable", () => {
    expect(productPath({ id: 9, name: "###" })).toBe("/product/9");
    expect(productSlug("---")).toBe("");
  });
  it("reads the id from a slug form, a bare id, and a stale slug alike", () => {
    expect(productIdFromParam("wedding-cake-3-5g-300000123")).toBe(300000123);
    expect(productIdFromParam("300000123")).toBe(300000123);
    expect(productIdFromParam("old-name-300000123")).toBe(300000123);
  });
  it("rejects anything without a trailing id", () => {
    expect(productIdFromParam("wedding-cake")).toBeNull();
    expect(productIdFromParam("")).toBeNull();
    expect(productIdFromParam("abc-0")).toBeNull();
  });
});
