import { describe, expect, it } from "vitest";
import { INDEXABLE_PATHS } from "@/lib/seo";
import { computeSalary } from "@/lib/salaryPages";
import { ukEngine } from "@/lib/tax/uk/engine";
import { usEngine } from "@/lib/tax/us/engine";
import { inEngine } from "@/lib/tax/in/engine";
import { generateStaticParams } from "./page";

describe("salary level pages", () => {
  const params = generateStaticParams();

  it("builds the curated list per country", () => {
    expect(params.filter((p) => p.country === "uk")).toHaveLength(15);
    expect(params.filter((p) => p.country === "us")).toHaveLength(15);
    expect(params.filter((p) => p.country === "in").map((p) => p.gross)).toEqual([
      "300000",
      "500000",
      "700000",
      "1000000",
      "1500000",
      "2000000",
      "2500000",
      "3000000",
    ]);
    expect(params).toContainEqual({ country: "uk", gross: "50000" });
    expect(params).not.toContainEqual({ country: "uk", gross: "300000" });
  });

  it("indexes UK pages only", () => {
    expect(INDEXABLE_PATHS).toContain("/uk/salary-calculator/50000");
    expect(INDEXABLE_PATHS).not.toContain("/in/salary-calculator/500000");
  });

  it("matches the UK engine", async () => {
    const out = ukEngine({
      country: "uk",
      taxYear: "2026",
      gross: 50000,
      period: "year",
      region: "england",
      options: {},
    });
    if (out.status !== "ready") throw new Error("not ready");
    expect((await computeSalary("uk", 50000))?.net).toBe(out.result.net);
  });

  it("matches the US and India engines", async () => {
    const us = usEngine({
      country: "us",
      taxYear: "2026",
      gross: 80000,
      period: "year",
      options: {},
    });
    const ind = inEngine({
      country: "in",
      taxYear: "2026",
      gross: 1500000,
      period: "year",
      options: {},
    });
    if (us.status !== "ready" || ind.status !== "ready") throw new Error("not ready");
    expect((await computeSalary("us", 80000))?.net).toBe(us.result.net);
    expect((await computeSalary("in", 1500000))?.net).toBe(ind.result.net);
  });
});
