import { describe, expect, it } from "vitest";
import { usStates } from "@/lib/tax/us/states.2026";
import { LARGEST, STATES } from "./UsFields";

describe("US state list", () => {
  it("every largest-state slug exists in the rules", () => {
    for (const slug of LARGEST) expect(Object.hasOwn(usStates, slug)).toBe(true);
  });

  it("lists 51 unique states", () => {
    const values = STATES.map((s) => s.value);
    expect(values).toHaveLength(51);
    expect(new Set(values).size).toBe(51);
  });

  it("marks a pending state in its label", () => {
    expect(STATES.find((s) => s.value === "ohio")?.label).toContain("state tax not included");
  });
});
