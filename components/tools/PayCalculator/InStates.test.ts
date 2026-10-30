import { describe, expect, it } from "vitest";
import { inRates } from "@/lib/tax/in/rates.2026";
import { STATES } from "./InFields";

describe("India state list", () => {
  it("covers 28 states and 8 union territories, sorted by name, without repeats", () => {
    expect(STATES).toHaveLength(36);
    const labels = STATES.map((s) => s.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
    expect(new Set(STATES.map((s) => s.value)).size).toBe(36);
  });

  it("every state with a professional tax schedule is in the list", () => {
    const values = STATES.map((s) => s.value);
    for (const key of Object.keys(inRates.professionalTax)) expect(values).toContain(key);
  });
});
