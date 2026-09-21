import { describe, expect, it } from "vitest";
import { cleanEmail } from "./site";

describe("cleanEmail (STORE-EMAIL-01)", () => {
  it("trims and lower-cases a real address", () => {
    expect(cleanEmail("  Sam.Lee+deals@Gmail.COM ")).toBe("sam.lee+deals@gmail.com");
  });
  it("answers null for anything else, so an optional field never fails an order", () => {
    for (const bad of ["", "  ", "sam", "sam@", "@gmail.com", "sam@gmail", "sam @gmail.com", "sam@gmail..com", 42, null, undefined, {}])
      expect(cleanEmail(bad)).toBeNull();
  });
});
