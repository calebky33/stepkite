import { describe, expect, it } from "vitest";
import { PLANS, cadenceLabel, formatPrice, getPlan, type PlanCode } from "./plans";

describe("PLANS", () => {
  it("lists the four plans in the order the pricing page renders them", () => {
    expect(PLANS.map((p) => p.code)).toEqual(["free", "monthly", "yearly", "lifetime"]);
  });

  it("uses USD as the default currency on every plan", () => {
    for (const plan of PLANS) expect(plan.currency).toBe("USD");
  });

  it("sets the right billing cadence on each plan", () => {
    expect(getPlan("free").interval).toBeNull();
    expect(getPlan("monthly").interval).toBe("month");
    expect(getPlan("yearly").interval).toBe("year");
    expect(getPlan("lifetime").interval).toBeNull();
  });

  it("gives each plan a non-empty features list and a readable name", () => {
    for (const plan of PLANS) {
      expect(plan.name.length).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });
});

describe("plan prices", () => {
  it("matches the amount in cents written in docs/MONETIZATION.md", () => {
    const amounts: Record<PlanCode, number> = {
      free: 0,
      monthly: 999,
      yearly: 3900,
      lifetime: 14900,
    };
    for (const plan of PLANS) expect(plan.amountCents).toBe(amounts[plan.code]);
  });

  it("formats as the dollar amount shown on the pricing page", () => {
    expect(formatPrice(getPlan("free"))).toBe("Free");
    expect(formatPrice(getPlan("monthly"))).toBe("$9.99");
    expect(formatPrice(getPlan("yearly"))).toBe("$39");
    expect(formatPrice(getPlan("lifetime"))).toBe("$149");
  });

  it("labels each plan with the right cadence", () => {
    expect(cadenceLabel(getPlan("free"))).toBe("");
    expect(cadenceLabel(getPlan("monthly"))).toBe("per month");
    expect(cadenceLabel(getPlan("yearly"))).toBe("per year");
    expect(cadenceLabel(getPlan("lifetime"))).toBe("one time");
  });
});

describe("getPlan", () => {
  it("returns the matching plan", () => {
    expect(getPlan("monthly").amountCents).toBe(999);
  });
});
