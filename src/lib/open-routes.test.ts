import { describe, expect, it } from "vitest";
import { OPEN_ROUTES, isOpenRoute } from "@/lib/open-routes";

/**
 * The age gate is an ALLOWLIST: src/proxy.ts rewrites everything that is not an
 * open route to /age. That default is what makes adding a page safe.
 *
 * These tests exist to keep it that way. The failure they guard against is
 * quiet — someone adds a shelf page to OPEN_ROUTES to "fix" a redirect during
 * development, and the catalogue starts rendering to un-gated visitors with
 * nothing looking broken. The RSC flight payload carries the product list, so
 * that leak is complete: names, prices and URLs, readable from view-source.
 */

/** Every page that renders catalogue data. Extend this when a shelf is added. */
const SHELF_ROUTES = [
  "/",
  "/products",
  "/brands",
  "/brand/12",
  "/deals",
  "/deal/7",
  "/track/abc123",
  "/category/5",
  "/product/99",
  "/cart",
  "/checkout",
  "/faq",
  "/returns",
];

describe("age gate allowlist", () => {
  it.each(SHELF_ROUTES)("keeps %s behind the gate", (route) => {
    expect(isOpenRoute(route)).toBe(false);
  });

  it.each([...OPEN_ROUTES])("lets the legal notice %s through", (route) => {
    expect(isOpenRoute(route)).toBe(true);
  });

  it("stays limited to legal notices and the support page", () => {
    // A deliberate tripwire: widening this list is a decision that should have
    // to be made twice, once in the code and once here.
    expect([...OPEN_ROUTES].sort()).toEqual(["/contact", "/privacy", "/terms"]);
  });

  it("treats a trailing slash as the same route", () => {
    expect(isOpenRoute("/privacy/")).toBe(true);
    expect(isOpenRoute("/products/")).toBe(false);
  });

  it("does not open a route by prefix", () => {
    // "/terms" being open must not open "/terms-and-menu".
    expect(isOpenRoute("/terms-and-menu")).toBe(false);
    expect(isOpenRoute("/privacy/menu")).toBe(false);
  });
});
