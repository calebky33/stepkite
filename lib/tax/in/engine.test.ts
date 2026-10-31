import { describe, expect, it } from "vitest";
import type { PayInput, PayResult } from "../types";
import { incomeTaxFor, inEngine, slabTax } from "./engine";
import { inRates } from "./rates.2026";

// No official page found for India 2026 to 27 gives a full CTC to in-hand worked example. The
// incometax.gov.in FAQ pages carry no figures, and the Finance Bill 2026 memorandum gives rates only.
// Every expected value below is therefore derived by hand from the published rates, with the
// arithmetic beside it. Two tests check official statements instead of calculations: a salaried
// person with 12.75 lakh pays nil tax (PIB release on the 12 lakh rebate, standard deduction 75,000),
// and the 4 percent cess is added to tax plus surcharge (Finance Bill 2026 memorandum).
//
// Official figures used: new regime (section 202) slabs 0 to 4L nil, 5 percent to 8L, 10 percent
// to 12L, 15 percent to 16L, 20 percent to 20L, 25 percent to 24L, 30 percent above. Old regime
// 0 to 2.5L nil, 5 percent to 5L, 20 percent to 10L, 30 percent above. Standard deduction 75,000
// new and 50,000 old. Rebate: new 60,000 up to 12L, old 12,500 up to 5L. Surcharge 10 percent
// over 50L, 15 percent over 1 crore, 25 percent over 2 crore, old regime 37 percent over 5 crore.
// Cess 4 percent. Gratuity is basic x 15 / 26 / 12. Provident fund is 12 percent of basic.

const LAKH = 100_000;
const CRORE = 10_000_000;

function run(
  gross: number,
  options: PayInput["options"] = {},
  extra: Partial<PayInput> = {},
): PayResult {
  const out = inEngine({
    country: "in",
    taxYear: "2026",
    gross,
    period: "year",
    options,
    ...extra,
  });
  if (out.status !== "ready") throw new Error("engine not ready");
  return out.result;
}

const line = (r: PayResult, key: string) => r.lines.find((l) => l.key === key)?.amount ?? 0;
const total = (b: ReturnType<typeof incomeTaxFor>) => b.tax + b.surcharge + b.cess;

describe("rates file", () => {
  it("is loaded and every figure has a source and a verification date", () => {
    expect(inRates.loaded).toBe(true);
    expect(inRates.verifiedOn).toBe("2026-10-30");
    const sourced = [
      inRates.cess,
      inRates.section80cCap,
      inRates.section80dCap,
      inRates.hra,
      inRates.provident,
      inRates.providentWageCeiling,
      inRates.gratuity,
      ...Object.values(inRates.professionalTax),
      ...Object.values(inRates.regimes).flatMap((r) => [
        r.slabs,
        r.standardDeduction,
        r.rebate,
        r.surcharge,
      ]),
    ];
    for (const s of sourced) {
      expect(s.source).toMatch(/^https:\/\//);
      // A figure has a verification date or an unverified note, never both.
      if (s.unverifiedNote === undefined) expect(s.verifiedOn).toBe("2026-10-30");
      else expect(s.verifiedOn).toBeUndefined();
    }
  });
});

describe("new regime slab tax (hand derived)", () => {
  it("slab edges: 4L nil, 8L 20,000, 12L 60,000, 16L 1,20,000, 20L 2,00,000, 24L 3,00,000", () => {
    const s = inRates.regimes.new.slabs.value;
    expect(slabTax(4 * LAKH, s)).toBe(0);
    expect(slabTax(8 * LAKH, s)).toBe(20_000);
    expect(slabTax(12 * LAKH, s)).toBe(60_000);
    expect(slabTax(16 * LAKH, s)).toBe(120_000);
    expect(slabTax(20 * LAKH, s)).toBe(200_000);
    expect(slabTax(24 * LAKH, s)).toBe(300_000);
  });

  it("30 lakh: 3,00,000 + 6L x 30% = 4,80,000; cess 19,200; total 4,99,200", () => {
    const b = incomeTaxFor(30 * LAKH, "new");
    expect(b.tax).toBeCloseTo(480_000, 2);
    expect(b.cess).toBeCloseTo(19_200, 2);
    expect(total(b)).toBeCloseTo(499_200, 2);
  });

  it("zero income gives zero tax", () => {
    const b = incomeTaxFor(0, "new");
    expect(total(b)).toBe(0);
  });
});

describe("new regime rebate cliff and marginal relief", () => {
  it("12L exactly: tax 60,000 fully rebated, so nil", () => {
    const b = incomeTaxFor(12 * LAKH, "new");
    expect(b.rebate).toBe(60_000);
    expect(total(b)).toBe(0);
  });

  it("12,00,001: slab tax 60,000.15, tax held to the 1 rupee over 12L", () => {
    const b = incomeTaxFor(12 * LAKH + 1, "new");
    expect(b.tax).toBeCloseTo(1, 2);
    expect(b.cess).toBeCloseTo(0.04, 2);
  });

  it("12,10,000: tax held to 10,000 (slab tax 61,500)", () => {
    expect(incomeTaxFor(12 * LAKH + 10_000, "new").tax).toBeCloseTo(10_000, 2);
  });

  it("13L: relief has run out, full slab tax 60,000 + 1L x 15% = 75,000", () => {
    expect(incomeTaxFor(13 * LAKH, "new").tax).toBeCloseTo(75_000, 2);
  });

  it("official statement: a salaried person with 12.75L pays nil (12.75L less 75,000 standard deduction)", () => {
    const taxable = 12.75 * LAKH - inRates.regimes.new.standardDeduction.value;
    expect(total(incomeTaxFor(taxable, "new"))).toBe(0);
  });
});

describe("old regime", () => {
  it("slab edges: 2.5L nil, 5L 12,500, 10L 1,12,500", () => {
    const s = inRates.regimes.old.slabs.value;
    expect(slabTax(250_000, s)).toBe(0);
    expect(slabTax(500_000, s)).toBe(12_500);
    expect(slabTax(1_000_000, s)).toBe(112_500);
  });

  it("5L exactly: tax 12,500 fully rebated, so nil", () => {
    expect(total(incomeTaxFor(5 * LAKH, "old"))).toBe(0);
  });

  it("5,00,001: the old regime rebate is a cliff, tax is 12,500.20 plus 4% cess", () => {
    const b = incomeTaxFor(5 * LAKH + 1, "old");
    expect(b.tax).toBeCloseTo(12_500.2, 2);
    expect(b.cess).toBeCloseTo(500.01, 2);
  });

  it("15L: 1,12,500 + 5L x 30% = 2,62,500; cess 10,500; total 2,73,000", () => {
    const b = incomeTaxFor(15 * LAKH, "old");
    expect(b.tax).toBeCloseTo(262_500, 2);
    expect(total(b)).toBeCloseTo(273_000, 2);
  });
});

describe("surcharge thresholds and marginal relief", () => {
  it("50L exactly: no surcharge (income must exceed 50L)", () => {
    const b = incomeTaxFor(50 * LAKH, "new");
    expect(b.tax).toBeCloseTo(1_080_000, 2);
    expect(b.surcharge).toBe(0);
  });

  it("50,00,001: 10% would be 1,08,000 but relief holds extra tax to the 1 rupee over, so 0.70", () => {
    const b = incomeTaxFor(50 * LAKH + 1, "new");
    expect(b.surcharge).toBeCloseTo(0.7, 2);
  });

  it("60L: tax 13,80,000, surcharge 10% = 1,38,000, cess 4% of 15,18,000 = 60,720", () => {
    const b = incomeTaxFor(60 * LAKH, "new");
    expect(b.tax).toBeCloseTo(1_380_000, 2);
    expect(b.surcharge).toBeCloseTo(138_000, 2);
    expect(b.cess).toBeCloseTo(60_720, 2);
  });

  it("1 crore exactly: surcharge stays 10% = 2,58,000", () => {
    expect(incomeTaxFor(CRORE, "new").surcharge).toBeCloseTo(258_000, 2);
  });

  it("1 crore + 1: 15% capped by relief to 2,58,000.70 (tax at 1 crore with 10% plus 1 rupee)", () => {
    expect(incomeTaxFor(CRORE + 1, "new").surcharge).toBeCloseTo(258_000.7, 1);
  });

  it("2 crore + 1: 25% capped by relief to 8,37,000.70", () => {
    expect(incomeTaxFor(2 * CRORE + 1, "new").surcharge).toBeCloseTo(837_000.7, 1);
  });

  it("new regime stays at 25% over 5 crore: 5 crore tax 1,45,80,000, surcharge 36,45,000", () => {
    const b = incomeTaxFor(5 * CRORE + 1_000_000, "new");
    expect(b.surcharge / b.tax).toBeCloseTo(0.25, 4);
    expect(incomeTaxFor(5 * CRORE, "new").surcharge).toBeCloseTo(3_645_000, 0);
  });

  it("old regime 5 crore + 1: 37% capped by relief to 37,03,125.70", () => {
    const b = incomeTaxFor(5 * CRORE + 1, "old");
    expect(b.surcharge).toBeCloseTo(3_703_125.7, 1);
  });

  it("old regime 6 crore: 37% applies in full, no relief left", () => {
    const b = incomeTaxFor(6 * CRORE, "old");
    expect(b.surcharge / b.tax).toBeCloseTo(0.37, 4);
  });

  it("total tax never rises by more than the extra income at a threshold", () => {
    for (const edge of [50 * LAKH, CRORE, 2 * CRORE, 5 * CRORE]) {
      for (const regime of ["new", "old"] as const) {
        const jump = total(incomeTaxFor(edge + 1, regime)) - total(incomeTaxFor(edge, regime));
        // One extra rupee of income may add at most one rupee of tax and surcharge, plus 4 percent cess.
        expect(jump).toBeLessThanOrEqual(1.04 + 1e-6);
      }
    }
  });
});

describe("CTC to in-hand, new regime (hand derived)", () => {
  it("20L CTC: basic 10L, PF 1,20,000, gratuity 48,076.92, taxable 17,56,923.08, tax 1,51,384.62, cess 6,055.38", () => {
    // taxable salary 20,00,000 - 1,20,000 - 48,076.92 = 18,31,923.08; less 75,000 = 17,56,923.08
    // tax 20,000 + 40,000 + 60,000 + 1,56,923.08 x 20% (31,384.62) = 1,51,384.62
    const r = run(20 * LAKH);
    expect(line(r, "employeePf")).toBe(120_000);
    expect(line(r, "employerPf")).toBe(120_000);
    expect(line(r, "gratuity")).toBe(48_076.92);
    expect(line(r, "incomeTax")).toBe(151_384.62);
    expect(line(r, "cess")).toBe(6_055.38);
    expect(r.net).toBe(1_554_483.08);
    expect(r.perPeriod.year).toBe(1_554_483.08);
    expect(r.perPeriod.month).toBe(129_540.26);
    expect(r.perPeriod.week).toBe(29_893.91);
  });

  it("6L CTC: taxable 4,74,576.92, tax 3,728.85 fully rebated, so nil; net 5,13,576.92", () => {
    const r = run(6 * LAKH);
    expect(line(r, "incomeTax")).toBe(0);
    expect(line(r, "cess")).toBe(0);
    expect(line(r, "gratuity")).toBe(14_423.08);
    expect(r.net).toBe(513_576.92);
  });

  it("50L CTC: PF 3L, gratuity 1,20,192.31, taxable 45,04,807.69, tax 9,31,442.31, cess 37,257.69", () => {
    // 3,00,000 + (45,04,807.69 - 24,00,000) x 30% = 3,00,000 + 6,31,442.31
    const r = run(50 * LAKH);
    expect(line(r, "employeePf")).toBe(300_000);
    expect(line(r, "gratuity")).toBe(120_192.31);
    expect(line(r, "incomeTax")).toBe(931_442.31);
    expect(line(r, "cess")).toBe(37_257.69);
    expect(line(r, "surcharge")).toBe(0);
    expect(r.net).toBe(5_000_000 - (931_442.31 + 37_257.69 + 300_000 + 300_000 + 120_192.31));
  });

  it("1 crore CTC (the input limit) pays surcharge and the lines add up", () => {
    const r = run(CRORE);
    expect(line(r, "surcharge")).toBeGreaterThan(0);
    const sum = r.lines.reduce((s, l) => s + l.amount, 0);
    expect(r.net).toBeCloseTo(CRORE - sum, 2);
    expect(r.net).toBeGreaterThan(0);
  });

  it("1 rupee CTC does not go negative and pays no tax", () => {
    const r = run(1);
    expect(line(r, "incomeTax")).toBe(0);
    expect(r.net).toBeGreaterThan(0);
  });

  it("monthly input of 1,00,000 equals 12L a year", () => {
    expect(run(100_000, {}, { period: "month" })).toEqual(run(12 * LAKH));
  });

  it("hourly input uses hours per week over 52 weeks", () => {
    const r = run(500, {}, { period: "hour", hoursPerWeek: 40 });
    expect(r.gross).toBe(1_040_000);
  });

  it("rejects zero salary", () => {
    expect(() => run(0)).toThrow();
  });
});

describe("CTC to in-hand, old regime (hand derived)", () => {
  const options = {
    regime: "old",
    section80c: 30_000,
    section80d: 30_000,
    hraReceived: 400_000,
    rentPaid: 300_000,
    metro: "metro",
  };

  it("20L CTC: deductions 50,000 + HRA 2,00,000 + 80C 1,50,000 + 80D 25,000 = 4,25,000, tax 2,34,576.92, cess 9,383.08", () => {
    // taxable salary 18,31,923.08; HRA = min(4L, 3L - 1L, 50% x 10L) = 2L; 80C = min(1.5L, 1.2L PF + 30,000)
    // taxable 14,06,923.08; tax 12,500 + 1,00,000 + 4,06,923.08 x 30% = 2,34,576.92
    const r = run(20 * LAKH, options);
    expect(line(r, "incomeTax")).toBe(234_576.92);
    expect(line(r, "cess")).toBe(9_383.08);
    expect(r.net).toBe(1_467_963.08);
  });

  it("other city uses 40% of basic: HRA = min(4L, 2L, 4L) is still 2L, but 1.5L rent gives 50,000", () => {
    const r = run(20 * LAKH, { ...options, metro: "other", rentPaid: 150_000 });
    // HRA = min(4L, 1.5L - 1L, 4L) = 50,000; deductions 50,000 + 50,000 + 1,50,000 + 25,000 = 2,75,000
    // taxable 15,56,923.08; tax 1,12,500 + 5,56,923.08 x 30% = 2,79,576.92
    expect(line(r, "incomeTax")).toBe(279_576.92);
  });

  it("80C and 80D stop at their caps", () => {
    const a = run(20 * LAKH, { regime: "old", section80c: 150_000, section80d: 25_000 });
    const b = run(20 * LAKH, { regime: "old", section80c: 900_000, section80d: 500_000 });
    expect(line(b, "incomeTax")).toBe(line(a, "incomeTax"));
  });

  it("rent under 10% of basic gives no HRA exemption", () => {
    const a = run(20 * LAKH, { regime: "old", hraReceived: 400_000, rentPaid: 90_000 });
    const b = run(20 * LAKH, { regime: "old" });
    expect(line(a, "incomeTax")).toBe(line(b, "incomeTax"));
  });

  it("new regime ignores old regime fields", () => {
    expect(run(20 * LAKH, { ...options, regime: "new" })).toEqual(run(20 * LAKH));
  });
});

describe("both regimes for the same salary", () => {
  it("20L CTC with the deductions above: new regime takes home more", () => {
    const o = run(20 * LAKH, {
      regime: "old",
      section80c: 30_000,
      section80d: 30_000,
      hraReceived: 400_000,
      rentPaid: 300_000,
    });
    const n = run(20 * LAKH, { regime: "new" });
    expect(n.net).toBeGreaterThan(o.net);
  });

  it("8L CTC and no extra deductions: new regime nil, old regime pays 39,453.85", () => {
    // Taxable salary 8,00,000 - 48,000 PF - 19,230.77 gratuity = 7,32,769.23.
    // New: less 75,000 is 6,57,769.23, tax 20,000 + 2,57,769.23 x 10% is under the 12L rebate, so nil.
    // Old: less 50,000 standard and 48,000 PF under 80C is 6,34,769.23.
    // Tax 12,500 + 1,34,769.23 x 20% = 39,453.85 (above the 5L rebate limit, so no rebate).
    const n = run(8 * LAKH, { regime: "new" });
    const o = run(8 * LAKH, { regime: "old" });
    expect(line(n, "incomeTax")).toBe(0);
    expect(line(o, "incomeTax")).toBe(39_453.85);
  });

  it("12 LPA CTC, new regime: tax rebated to nil, net 10,27,153.85 a year", () => {
    // Basic 6L, PF 72,000, gratuity 28,846.15, taxable 10,24,153.85 under the 12L rebate limit.
    const r = run(12 * LAKH);
    expect(line(r, "incomeTax")).toBe(0);
    expect(r.net).toBe(1_027_153.85);
    expect(r.perPeriod.month).toBe(85_596.15);
  });
});

describe("provident fund and professional tax", () => {
  it("capped provident fund uses 15,000 for 169 days and 25,000 for 196 days", () => {
    // 12% x 12 x (15,000 x 169 + 25,000 x 196) / 365 = 29,332.60
    const r = run(20 * LAKH, { pfCapped: true });
    expect(line(r, "employeePf")).toBeCloseTo(29_332.6, 2);
  });

  it("capped provident fund is not above 12% of actual basic when basic is under the ceiling", () => {
    // CTC 3L: basic 12,500 a month, under both ceilings, so 12% of 1,50,000 = 18,000.
    expect(line(run(3 * LAKH, { pfCapped: true }), "employeePf")).toBe(18_000);
  });

  it("Telangana: monthly CTC 50,000 pays 200 a month, 2,400 a year", () => {
    const r = run(6 * LAKH, {}, { region: "telangana" });
    expect(line(r, "professionalTax")).toBe(2_400);
    expect(r.net).toBe(511_176.92);
  });

  it("Telangana bands use monthly salary after employer PF and gratuity, not CTC", () => {
    // Salary is CTC x 0.915962 (PF 6% and gratuity 2.4038% of CTC come off), divided by 12.
    // CTC 1,96,000 is 14,962 a month: nil. CTC 1,97,000 is 15,038: 150.
    // CTC 2,62,000 is 19,999 a month: 150. CTC 2,63,000 is 20,075: 200.
    const pt = (ctc: number) => line(run(ctc, {}, { region: "telangana" }), "professionalTax");
    expect(pt(196_000)).toBe(0);
    expect(pt(197_000)).toBe(1_800);
    expect(pt(262_000)).toBe(1_800);
    expect(pt(263_000)).toBe(2_400);
  });

  it("region is trimmed and case insensitive", () => {
    expect(line(run(6 * LAKH, {}, { region: "  Telangana " }), "professionalTax")).toBe(2_400);
  });

  it("old regime takes professional tax off taxable pay, new regime does not", () => {
    // Old, 20L, Telangana: salary 18,31,923.08; deductions 50,000 + PT 2,400 + 80C 1,20,000 (PF) = 1,72,400.
    // Taxable 16,59,523.08; tax 12,500 + 1,00,000 + 6,59,523.08 x 30% = 3,10,356.92.
    const o = run(20 * LAKH, { regime: "old" }, { region: "telangana" });
    expect(line(o, "incomeTax")).toBe(310_356.92);
    expect(line(o, "cess")).toBe(12_414.28);
    const withoutPt = run(20 * LAKH, { regime: "old" });
    expect(line(withoutPt, "incomeTax")).toBeCloseTo(310_356.92 + 2_400 * 0.3, 2);
    // New regime: tax is the same with or without a state.
    const n = run(20 * LAKH, {}, { region: "telangana" });
    expect(line(n, "incomeTax")).toBe(151_384.62);
  });

  it("a state without a checked schedule adds no professional tax and says so", () => {
    const r = run(6 * LAKH, {}, { region: "maharashtra" });
    expect(line(r, "professionalTax")).toBe(0);
    expect(r.assumptions.some((a) => a.includes("Professional tax is not included"))).toBe(true);
  });

  it("inherited object keys are not read as states", () => {
    for (const region of ["constructor", "__proto__", "toString"]) {
      expect(() => run(6 * LAKH, {}, { region })).not.toThrow();
      expect(line(run(6 * LAKH, {}, { region }), "professionalTax")).toBe(0);
    }
  });
});

describe("options and labels", () => {
  it("an unknown regime falls back to the new regime and says so", () => {
    const r = run(20 * LAKH, { regime: "constructor" });
    expect(line(r, "incomeTax")).toBe(151_384.62);
    expect(r.assumptions.some((a) => a.includes("not recognised"))).toBe(true);
  });

  it("states the financial year and assessment year", () => {
    const text = run(20 * LAKH).assumptions.join(" ");
    expect(text).toContain("2026 to 27");
    expect(text).toContain("assessment year 2027 to 28");
    expect(text).toContain("Income-tax Act, 2025");
  });

  it("states the provident fund and gratuity assumptions", () => {
    const text = run(20 * LAKH).assumptions.join(" ");
    expect(text).toContain("Provident fund is 12 percent of your full basic pay");
    expect(text).toContain("Gratuity");
  });

  it("labels use no dashes or slashes", () => {
    for (const l of run(CRORE, { regime: "old" }, { region: "telangana" }).lines) {
      expect(l.label).not.toMatch(/[/–—]|\s-\s/);
    }
  });
});

describe("limits, validation and source notes", () => {
  it("HRA is limited to the pay left in CTC after basic, PF and gratuity", () => {
    // Basic 90 percent leaves nothing for HRA, so a large HRA and rent give no exemption.
    const a = run(20 * LAKH, {
      regime: "old",
      basicPercent: 90,
      hraReceived: 1_000_000,
      rentPaid: 1_000_000,
    });
    const b = run(20 * LAKH, { regime: "old", basicPercent: 90 });
    expect(line(a, "incomeTax")).toBe(line(b, "incomeTax"));
  });

  it("an invalid basic share and a missing city type each add an assumption", () => {
    const r = run(20 * LAKH, { regime: "old", basicPercent: 250 });
    expect(r.assumptions.some((a) => a.includes("basic pay share was not valid"))).toBe(true);
    expect(r.assumptions.some((a) => a.includes("city type was not given"))).toBe(true);
  });

  it("other deductions are not counted and the result says so", () => {
    const a = run(20 * LAKH, { otherDeductions: 50_000 });
    expect(a.net).toBe(run(20 * LAKH).net);
    expect(a.assumptions.some((x) => x.includes("Other deductions are not counted"))).toBe(true);
  });

  it("every line has a source link and a plain label", () => {
    for (const l of run(20 * LAKH, {}, { region: "telangana" }).lines) {
      expect(l.source).toMatch(/^https:\/\//);
      expect(l.sourceLabel).toBeTruthy();
      expect(l.sourceLabel).not.toMatch(/[/–—]|\s-\s/);
    }
  });

  it("figures that rest on search excerpts carry an unverified note", () => {
    expect(inRates.section80cCap.unverifiedNote).toBeTruthy();
    expect(inRates.section80dCap.unverifiedNote).toBeTruthy();
    expect(inRates.hra.unverifiedNote).toBeTruthy();
    expect(inRates.providentWageCeiling.unverifiedNote).toBeTruthy();
    expect(inRates.gratuity.unverifiedNote).toBeTruthy();
  });

  it("extremes: 1 rupee, 1 crore and huge rent and 80C stay finite and non negative", () => {
    const cases = [
      run(1),
      run(CRORE),
      run(CRORE, {
        regime: "old",
        rentPaid: 10_000_000,
        hraReceived: 10_000_000,
        section80c: 10_000_000,
        section80d: 10_000_000,
      }),
    ];
    for (const r of cases) {
      expect(Number.isFinite(r.net)).toBe(true);
      expect(r.net).toBeGreaterThan(0);
      expect(r.net).toBeLessThan(r.gross);
      for (const l of r.lines) expect(l.amount).toBeGreaterThanOrEqual(0);
    }
  });
});
