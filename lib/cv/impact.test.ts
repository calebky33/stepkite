import { describe, expect, it } from "vitest";
import { buildBlocks, estimateHeight } from "./paginate";
import { cvSchema, emptyCv } from "./schema";

describe("impact field", () => {
  it("defaults to none for a CV saved before the field existed", () => {
    const old: Record<string, unknown> = { ...emptyCv("a", "uk", "2026-01-01T00:00:00.000Z") };
    delete old.impact;
    const parsed = cvSchema.safeParse({ ...old, sectionOrder: ["summary", "experience"] });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.impact).toEqual([]);
  });

  it("limits impact to 12 lines of 300 characters", () => {
    const base = emptyCv("a", "uk", "2026-01-01T00:00:00.000Z");
    expect(cvSchema.safeParse({ ...base, impact: Array(13).fill("Saved 5 hours") }).success).toBe(
      false,
    );
    expect(cvSchema.safeParse({ ...base, impact: ["x".repeat(301)] }).success).toBe(false);
  });

  it("makes a block only when there is a line, and keeps old section orders working", () => {
    const base = emptyCv("a", "uk", "2026-01-01T00:00:00.000Z");
    expect(buildBlocks(base)).toEqual([]);
    const cv = { ...base, impact: ["Handled 40 orders a day"], sectionOrder: ["summary" as const] };
    const blocks = buildBlocks(cv);
    expect(blocks.map((b) => b.kind)).toEqual(["impact"]);
    expect(estimateHeight(cv, blocks[0]!)).toBeGreaterThan(0);
  });
});
