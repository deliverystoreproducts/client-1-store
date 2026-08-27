import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  browseQueryString,
  parseBrowseFilters,
  toCatalogQuery,
} from "@/lib/catalog-query";

/**
 * Four pages share this module. A regression here does not throw — it silently
 * drops a filter, and the shelf quietly stops narrowing. So the round-trip and
 * the pinning rules are pinned down here rather than left to the pages.
 */

const empty = parseBrowseFilters({});

describe("parseBrowseFilters", () => {
  it("reads every dimension the catalogue supports", () => {
    const f = parseBrowseFilters({
      q: "gelato",
      category: "5",
      brand: "9",
      genetics: "INDICA",
      minPrice: "20",
      maxPrice: "80",
      minThc: "18",
      maxThc: "30",
      onSale: "true",
      sort: "price_asc",
      page: "3",
    });
    expect(f).toMatchObject({
      search: "gelato",
      categoryId: 5,
      brandId: 9,
      genetics: "indica",
      minPrice: 20,
      maxPrice: 80,
      minThc: 18,
      maxThc: 30,
      onSale: true,
      sort: "price_asc",
      page: 3,
    });
  });

  it("swaps an inverted range instead of returning nothing", () => {
    // A shelf that answers "no products" to 80–20 reads as an empty shop.
    const f = parseBrowseFilters({ minPrice: "80", maxPrice: "20" });
    expect(f.minPrice).toBe(20);
    expect(f.maxPrice).toBe(80);
  });

  it("clamps THC to a percentage and prices to a sane ceiling", () => {
    const f = parseBrowseFilters({ minThc: "-5", maxThc: "900", minPrice: "-1e9" });
    expect(f.minThc).toBe(0);
    expect(f.maxThc).toBe(100);
    expect(f.minPrice).toBe(0);
  });

  it("drops junk rather than forwarding it upstream", () => {
    const f = parseBrowseFilters({
      genetics: "purple",
      sort: "cheapest",
      minPrice: "abc",
      page: "0",
    });
    expect(f.genetics).toBeUndefined();
    expect(f.sort).toBeUndefined();
    expect(f.minPrice).toBeUndefined();
    expect(f.page).toBe(1);
  });

  it("caps a runaway search string", () => {
    expect(parseBrowseFilters({ q: "x".repeat(500) }).search).toHaveLength(120);
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseBrowseFilters({ category: ["5", "9"] }).categoryId).toBe(5);
  });
});

describe("browseQueryString", () => {
  it("round-trips through parse unchanged", () => {
    const original = parseBrowseFilters({
      q: "gelato",
      category: "5",
      genetics: "hybrid",
      minThc: "20",
      onSale: "true",
      sort: "name_asc",
    });
    const reparsed = parseBrowseFilters(
      Object.fromEntries(new URLSearchParams(browseQueryString(original, { page: 1 }))),
    );
    expect(reparsed).toEqual(original);
  });

  it("resets to page 1 when a filter changes", () => {
    // Narrowing while on page 4 would otherwise land on an empty page 4.
    const f = parseBrowseFilters({ page: "4", category: "5" });
    expect(browseQueryString(f, { genetics: "indica" })).not.toContain("page");
  });

  it("keeps the page when the page itself is what changed", () => {
    const f = parseBrowseFilters({ category: "5" });
    expect(browseQueryString(f, { page: 3 })).toContain("page=3");
  });

  it("never emits the pinned dimension", () => {
    // On /category/5 the path owns the category; a ?category= would contradict it.
    const f = parseBrowseFilters({ category: "5", brand: "9" });
    const qs = browseQueryString(f, {}, "category");
    expect(qs).not.toContain("category=");
    expect(qs).toContain("brand=9");
  });

  it("emits nothing for an untouched shelf", () => {
    expect(browseQueryString(empty)).toBe("");
  });
});

describe("activeFilterCount", () => {
  it("ignores search and sort", () => {
    // Sort is always set to something; counting it shows "1 filter" on a shelf
    // nobody has narrowed.
    expect(activeFilterCount(parseBrowseFilters({ q: "gelato", sort: "price_asc" }))).toBe(0);
  });

  it("counts a range once, not once per bound", () => {
    expect(activeFilterCount(parseBrowseFilters({ minPrice: "20", maxPrice: "80" }))).toBe(1);
  });

  it("does not count the dimension the route pinned", () => {
    const f = parseBrowseFilters({ category: "5", genetics: "indica" });
    expect(activeFilterCount(f, "category")).toBe(1);
  });
});

describe("toCatalogQuery", () => {
  it("defaults to newest and omits empty values", () => {
    const q = toCatalogQuery(empty, 24);
    expect(q.sort).toBe("newest");
    expect(q.search).toBeUndefined();
    expect(q.onSale).toBeUndefined();
    expect(q.limit).toBe(24);
  });

  it("forwards the THC bounds the upstream accepts", () => {
    const q = toCatalogQuery(parseBrowseFilters({ minThc: "18", maxThc: "30" }), 24);
    expect(q.minThc).toBe(18);
    expect(q.maxThc).toBe(30);
  });
});
