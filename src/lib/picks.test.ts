import { describe, it, expect } from "vitest";
import { parsePickIds, MAX_PICKS } from "./picks";

describe("parsePickIds", () => {
  it("keeps the order the email used and drops duplicates", () => {
    expect(parsePickIds("300004679,300004626,300004679,300005314")).toEqual([300004679, 300004626, 300005314]);
  });
  it("accepts repeated params and stray spaces", () => {
    expect(parsePickIds(["12, 7", "9"])).toEqual([12, 7, 9]);
  });
  it("ignores anything that is not a positive integer", () => {
    expect(parsePickIds("1,-2,0,3.5,abc,4e2,<script>,99999999999999999999, 5")).toEqual([1, 5]);
    expect(parsePickIds(undefined)).toEqual([]);
    expect(parsePickIds("")).toEqual([]);
  });
  it("caps the list so a link cannot ask for the whole catalogue", () => {
    const many = Array.from({ length: 200 }, (_, i) => i + 1).join(",");
    expect(parsePickIds(many)).toHaveLength(MAX_PICKS);
  });
});
