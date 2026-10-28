import { describe, expect, it } from "vitest";
import { convertGross } from "./period";

describe("convertGross", () => {
  it("divides by 12 from year to month", () => {
    expect(convertGross(30000, "year", "month")).toBe(2500);
  });

  it("multiplies by 12 from month to year", () => {
    expect(convertGross(2500, "month", "year")).toBe(30000);
  });

  it("round trips year to month and back", () => {
    const month = convertGross(36000, "year", "month");
    expect(convertGross(month, "month", "year")).toBe(36000);
  });

  it("uses 52 weeks for week", () => {
    expect(convertGross(52000, "year", "week")).toBe(1000);
    expect(convertGross(1000, "week", "year")).toBe(52000);
  });

  it("rounds to two decimals", () => {
    expect(convertGross(1000, "year", "month")).toBe(83.33);
  });

  it("keeps an empty field empty and the same period unchanged", () => {
    expect(convertGross(null, "year", "month")).toBeNull();
    expect(convertGross(30000, "year", "year")).toBe(30000);
  });
});
