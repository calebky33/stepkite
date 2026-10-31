import { describe, expect, it } from "vitest";
import { MAX_GROSS, MIN_GROSS, payInputSchema, type PayInput } from "./types";

const base: PayInput = {
  country: "uk",
  taxYear: "2026",
  gross: 30000,
  period: "year",
  options: {},
};

describe("payInputSchema", () => {
  it("accepts a valid input", () => {
    expect(payInputSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an unknown country", () => {
    expect(payInputSchema.safeParse({ ...base, country: "fr" }).success).toBe(false);
  });

  it("rejects gross outside the allowed range", () => {
    expect(payInputSchema.safeParse({ ...base, gross: MIN_GROSS - 1 }).success).toBe(false);
    expect(payInputSchema.safeParse({ ...base, gross: MAX_GROSS + 1 }).success).toBe(false);
  });

  it("rejects NaN and Infinity", () => {
    expect(payInputSchema.safeParse({ ...base, gross: Number.NaN }).success).toBe(false);
    expect(payInputSchema.safeParse({ ...base, gross: Number.POSITIVE_INFINITY }).success).toBe(
      false,
    );
  });

  it("rejects an unknown period", () => {
    expect(payInputSchema.safeParse({ ...base, period: "day" }).success).toBe(false);
  });
});
