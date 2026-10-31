import { describe, expect, it } from "vitest";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  exportCsv,
  importPreview,
  parseCsv,
  parseCsvDetailed,
  type CsvMapping,
} from "./csv";
import { DEFAULT_STAGES } from "./schema";
import { NOW, makeJob } from "./fixtures.test-util";

const ctx = { stages: DEFAULT_STAGES, now: NOW, newId: (n: number) => `new-${n}` };
const cols: CsvMapping = {
  title: 0,
  company: 1,
  stage: 2,
  salaryMin: 3,
  salaryMax: 4,
  currency: 5,
  period: 6,
  savedAt: 7,
  nextStep: 8,
  nextStepDue: 9,
  tags: 10,
};
const row = (over: Record<number, string> = {}) => {
  const base = ["Dev", "Acme", "", "", "", "", "", "", "", "", ""];
  for (const [k, v] of Object.entries(over)) base[Number(k)] = v;
  return base;
};

function roundTrip(jobs: Parameters<typeof exportCsv>[0]) {
  const parsed = parseCsv(exportCsv(jobs, DEFAULT_STAGES));
  if (!parsed.ok) throw new Error("parse failed");
  const [head = [], ...rows] = parsed.rows;
  return importPreview(rows, Object.fromEntries(head.map((h, i) => [h, i])), ctx);
}

describe("csv formulas and tags", () => {
  it("guards and unguards tab and carriage return cells", () => {
    const out = roundTrip([makeJob({ title: "\tevil", company: "\revil2" })]);
    expect(out.jobs[0]?.title).toBe("evil");
    expect(out.jobs[0]?.company).toBe("evil2");
  });
  it("round trips tags that hold a semicolon", () => {
    expect(roundTrip([makeJob({ tags: ["a;b", "c"] })]).jobs[0]?.tags).toEqual(["a;b", "c"]);
  });
});

describe("importPreview summary", () => {
  it("returns counts", () => {
    const out = importPreview([row(), row({ 0: "" })], cols, ctx);
    expect(out).toMatchObject({ total: 2, imported: 1, skipped: 1, defaulted: { stage: 2 } });
  });
  it("errors when there are no stages", () => {
    const out = importPreview([row()], cols, { ...ctx, stages: [] });
    expect(out.jobs).toEqual([]);
    expect(out.errors).toHaveLength(1);
  });
  it("warns about an unknown stage and counts blank stages as defaulted", () => {
    const out = importPreview([row({ 2: "Zzz" }), row()], cols, ctx);
    expect(out.warnings).toHaveLength(1);
    expect(JSON.stringify(out.warnings)).not.toContain("Zzz");
    expect(out.defaulted.stage).toBe(2);
  });
  it("maps closed to the rejected stage", () => {
    expect(importPreview([row({ 2: "closed" })], cols, ctx).jobs[0]?.stageId).toBe(
      "stage-rejected",
    );
  });
});

describe("importPreview salary", () => {
  it("requires a currency when none is given anywhere", () => {
    const out = importPreview([row({ 3: "50000" })], cols, ctx);
    expect(out.jobs).toEqual([]);
    expect(out.errors[0]?.message).toBe("Currency is missing in row 1.");
  });
  it("uses the default currency and counts defaults", () => {
    const ok = importPreview([row({ 3: "50000" })], cols, { ...ctx, defaultCurrency: "INR" });
    expect(ok.jobs[0]?.salary).toMatchObject({ currency: "INR", period: "annual" });
    expect(ok.defaulted).toMatchObject({ currency: 1, period: 1 });
  });
  it("reads formatted salaries and rejects text without echoing it", () => {
    const ok = importPreview([row({ 3: "£50,000", 4: "60k", 5: "GBP" })], cols, ctx);
    expect(ok.jobs[0]?.salary).toMatchObject({ min: 50000, max: 60000 });
    const bad = importPreview([row({ 3: "lots of money", 5: "GBP" })], cols, ctx);
    expect(bad.errors[0]?.message).toBe("Salary is not a number in row 1.");
    expect(JSON.stringify(bad)).not.toContain("lots");
  });
  it("names the pay field when min is above max", () => {
    const out = importPreview([row({ 3: "90", 4: "50", 5: "GBP" })], cols, ctx);
    expect(out.errors[0]?.message).toBe("Check Highest pay in row 1.");
  });
});

describe("importPreview dates and issues", () => {
  it("normalises date only and offset dates", () => {
    const out = importPreview(
      [
        row({ 7: "2026-03-05", 8: "Call", 9: "2026-04-10" }),
        row({ 7: "2026-03-05T10:00:00+01:00" }),
      ],
      cols,
      ctx,
    );
    expect(out.errors).toEqual([]);
    expect(out.jobs[0]?.savedAt).toMatch(/^2026-03-0[45]T/);
    expect(out.jobs[0]?.nextStep?.dueAt).toMatch(/^2026-04-1[01]T/);
    expect(out.jobs[1]?.savedAt).toBe("2026-03-05T09:00:00.000Z");
  });
  it("reports unreadable dates by column name", () => {
    const out = importPreview([row({ 7: "yesterday" })], cols, ctx);
    expect(out.errors[0]?.message).toBe("Saved on is not a date in row 1.");
  });
  it("reports up to three issues per row", () => {
    const out = importPreview([row({ 0: "", 1: "", 7: "x", 3: "y", 5: "GBP" })], cols, ctx);
    expect(out.errors).toHaveLength(3);
    expect(out.errors.every((e) => e.row === 1)).toBe(true);
  });
  it("warns about rows of a different width and half set next steps", () => {
    const out = importPreview([row(), ["Dev", "Acme"], row({ 8: "Call" })], cols, {
      ...ctx,
      headerWidth: 11,
    });
    expect(out.warnings.map((w) => w.message).join(" ")).toContain("different number of columns");
    expect(out.warnings.some((w) => w.message.includes("next step"))).toBe(true);
  });
});

describe("parseCsv extras", () => {
  it("reports skipped blank lines", () => {
    const r = parseCsvDetailed("a,b\n\n1,2\n\n");
    expect(r.ok && r.value.skippedBlank).toBe(2);
  });
  it("refuses a one column semicolon or tab file", () => {
    expect(parseCsv("title;company\nDev;Acme")).toEqual({ ok: false, error: "wrong-delimiter" });
    expect(parseCsv("title\tcompany\nDev\tAcme")).toEqual({ ok: false, error: "wrong-delimiter" });
    expect(parseCsv("title\nDev").ok).toBe(true);
  });
  it("measures size in bytes, not characters", () => {
    const emoji = "\u{1F600}".repeat(Math.ceil(CSV_MAX_BYTES / 4) + 1);
    expect(parseCsv(emoji)).toEqual({ ok: false, error: "too-big" });
  });
  it("stops at the row cap, allowing exactly the cap", () => {
    const over = "h\n" + "x\n".repeat(CSV_MAX_ROWS + 50);
    expect(parseCsv(over)).toEqual({ ok: false, error: "too-many-rows" });
    expect(parseCsv("h\n" + "x\n".repeat(CSV_MAX_ROWS)).ok).toBe(true);
    expect(parseCsv("h\n" + "x\n".repeat(CSV_MAX_ROWS + 1))).toEqual({
      ok: false,
      error: "too-many-rows",
    });
  });
});
