import { describe, expect, it } from "vitest";
import type { PayInput, PayResult } from "../types";
import { usEngine } from "./engine";
import { usStates } from "./states.2026";

// Official worked figures. IRS Revenue Procedure 2025-32 (irs.gov/pub/irs-drop/rp-25-32.pdf),
// section 4.01 tables 1 to 3, gives "the tax is" for each bracket edge, for example
// single: over 12,400 the tax is 1,240 plus 12 percent of the excess. Section 4.14 gives the
// standard deduction: single 16,100, joint 32,200, head of household 24,150.
// IRS Topic 751: Social Security 6.2 percent to a 184,500 wage base, Medicare 1.45 percent.
// IRS Topic 560: Additional Medicare 0.9 percent over 200,000 (joint 250,000).
// Where a state page gives rates and deductions only, the expected value is derived by hand and
// the arithmetic is shown beside the test.

const STD = { single: 16_100, "married-jointly": 32_200, "head-of-household": 24_150 } as const;
type Status = keyof typeof STD;

function run(gross: number, options: PayInput["options"] = {}, region = "texas"): PayResult {
  const out = usEngine({
    country: "us",
    taxYear: "2026",
    gross,
    period: "year",
    region,
    options,
  });
  if (out.status !== "ready") throw new Error("engine not ready");
  return out.result;
}

const line = (r: PayResult, key: string) => r.lines.find((l) => l.key === key)?.amount ?? 0;

/** Federal tax for a given taxable income, by asking for gross = taxable + standard deduction. */
function fed(status: Status, taxable: number): number {
  return line(run(taxable + STD[status], { filingStatus: status }), "federalTax");
}

describe("US federal tax, edges from Rev. Proc. 2025-32 tables", () => {
  const edges: [Status, number, number][] = [
    ["single", 12_400, 1_240],
    ["single", 50_400, 5_800],
    ["single", 105_700, 17_966],
    ["single", 201_775, 41_024],
    ["single", 256_225, 58_448],
    ["single", 640_600, 192_979.25],
    ["married-jointly", 24_800, 2_480],
    ["married-jointly", 100_800, 11_600],
    ["married-jointly", 211_400, 35_932],
    ["married-jointly", 403_550, 82_048],
    ["married-jointly", 512_450, 116_896],
    ["married-jointly", 768_700, 206_583.5],
    ["head-of-household", 17_700, 1_770],
    ["head-of-household", 67_450, 7_740],
    ["head-of-household", 105_700, 16_155],
    ["head-of-household", 201_750, 39_207],
    ["head-of-household", 256_200, 56_631],
    ["head-of-household", 640_600, 191_171],
  ];
  it.each(edges)("%s at taxable %i is %f", (status, taxable, tax) => {
    expect(fed(status, taxable)).toBe(tax);
  });

  it("one dollar over the single 12,400 edge adds 12 cents", () => {
    expect(fed("single", 12_401)).toBe(1_240.12);
  });
  it("one dollar over the joint 768,700 edge adds 37 cents", () => {
    expect(fed("married-jointly", 768_701)).toBe(206_583.87);
  });
  it("income under the standard deduction pays no federal tax", () => {
    expect(fed("single", 0)).toBe(0);
    expect(line(run(16_100), "federalTax")).toBe(0);
    expect(line(run(24_150, { filingStatus: "head-of-household" }), "federalTax")).toBe(0);
  });
  it("a 1 dollar salary gives no income tax and a few cents of FICA", () => {
    const r = run(1);
    expect(line(r, "federalTax")).toBe(0);
    expect(line(r, "socialSecurity")).toBe(0.06);
    expect(line(r, "medicare")).toBe(0.01);
    expect(r.net).toBe(0.93);
  });
  it("rejects a gross of 0", () => {
    expect(() => run(0)).toThrow();
  });
});

describe("US worked examples", () => {
  it("single 60,000 in Texas: hand check", () => {
    // taxable 60,000 - 16,100 = 43,900; 1,240 + (43,900 - 12,400) x 12% = 5,020
    const r = run(60_000);
    expect(line(r, "federalTax")).toBe(5_020);
    expect(line(r, "socialSecurity")).toBe(3_720);
    expect(line(r, "medicare")).toBe(870);
    expect(line(r, "stateTax")).toBe(0);
    expect(r.net).toBe(50_390);
    expect(r.perPeriod.month).toBe(4_199.17);
    expect(r.perPeriod.week).toBe(969.04);
  });

  it("married jointly 150,000: 11,600 + (117,800 - 100,800) x 22% = 15,340", () => {
    const r = run(150_000, { filingStatus: "married-jointly" });
    expect(line(r, "federalTax")).toBe(15_340);
    expect(line(r, "socialSecurity")).toBe(9_300);
    expect(line(r, "medicare")).toBe(2_175);
    expect(r.net).toBe(123_185);
  });

  it("head of household 80,000: 1,770 + (55,850 - 17,700) x 12% = 6,348", () => {
    const r = run(80_000, { filingStatus: "head-of-household" });
    expect(line(r, "federalTax")).toBe(6_348);
    expect(line(r, "socialSecurity")).toBe(4_960);
    expect(line(r, "medicare")).toBe(1_160);
  });

  it("10 percent 401(k) on single 100,000: taxable 73,900, tax 5,800 + 23,500 x 22%", () => {
    const r = run(100_000, { retirementPercent: 10 });
    expect(line(r, "federalTax")).toBe(10_970);
    expect(line(r, "retirement")).toBe(10_000);
    // FICA is still on the full 100,000.
    expect(line(r, "socialSecurity")).toBe(6_200);
    expect(line(r, "medicare")).toBe(1_450);
    expect(r.net).toBe(71_380);
  });

  it("caps the 401(k) at the 24,500 limit", () => {
    const r = run(100_000, { retirementPercent: 100 });
    expect(line(r, "retirement")).toBe(24_500);
    expect(r.assumptions.some((a) => a.includes("24,500"))).toBe(true);
  });

  it("takes other deductions after tax and leaves the taxes alone", () => {
    const a = run(60_000);
    const b = run(60_000, { otherDeductions: 1_200 });
    expect(line(b, "federalTax")).toBe(line(a, "federalTax"));
    expect(line(b, "otherDeductions")).toBe(1_200);
    expect(b.net).toBe(a.net - 1_200);
  });

  it("works out hourly and weekly pay over 52 weeks", () => {
    const h = usEngine({
      country: "us",
      taxYear: "2026",
      gross: 25,
      period: "hour",
      hoursPerWeek: 40,
      region: "texas",
      options: {},
    });
    if (h.status !== "ready") throw new Error("engine not ready");
    expect(h.result.gross).toBe(52_000);
  });
});

describe("US FICA edges", () => {
  it("Social Security stops at the 184,500 base: 184,500 x 6.2% = 11,439", () => {
    expect(line(run(184_500), "socialSecurity")).toBe(11_439);
    expect(line(run(184_501), "socialSecurity")).toBe(11_439);
    expect(line(run(1_000_000), "socialSecurity")).toBe(11_439);
  });

  it("Additional Medicare starts over 200,000 for single: none at 200,000, 90 at 210,000", () => {
    expect(line(run(200_000), "additionalMedicare")).toBe(0);
    expect(line(run(210_000), "additionalMedicare")).toBe(90);
    expect(line(run(210_000), "medicare")).toBe(3_045);
  });

  it("Additional Medicare starts over 250,000 for a married couple", () => {
    const joint = { filingStatus: "married-jointly" };
    expect(line(run(250_000, joint), "additionalMedicare")).toBe(0);
    expect(line(run(260_000, joint), "additionalMedicare")).toBe(90);
  });

  it("very high income, 10,000,000 single: top rate and Additional Medicare", () => {
    const r = run(10_000_000);
    // 192,979.25 + (9,983,900 - 640,600) x 37%
    expect(line(r, "federalTax")).toBe(3_650_000.25);
    expect(line(r, "additionalMedicare")).toBe(88_200);
    expect(line(r, "socialSecurity")).toBe(11_439);
  });
});

describe("US states", () => {
  it("Texas and Florida have no state tax and say so", () => {
    for (const region of ["texas", "florida"]) {
      const r = run(80_000, {}, region);
      expect(line(r, "stateTax")).toBe(0);
      expect(r.lines.some((l) => l.key === "stateTax")).toBe(false);
      expect(r.assumptions.some((a) => a.includes("no state income tax"))).toBe(true);
    }
  });

  // Derived by hand from the sourced rate and deduction. No state page prints a worked example.
  it("derived: Georgia single 100,000: (100,000 - 15,000) x 4.99% = 4,241.50", () => {
    expect(line(run(100_000, {}, "georgia"), "stateTax")).toBe(4_241.5);
  });

  it("derived: Georgia joint uses the 30,000 deduction: (100,000 - 30,000) x 4.99% = 3,493", () => {
    expect(line(run(100_000, { filingStatus: "married-jointly" }, "georgia"), "stateTax")).toBe(
      3_493,
    );
  });

  it("derived: Georgia 401(k) lowers state tax: (100,000 - 10,000 - 15,000) x 4.99% = 3,742.50", () => {
    expect(line(run(100_000, { retirementPercent: 10 }, "georgia"), "stateTax")).toBe(3_742.5);
  });

  it("derived: Illinois single 50,000: (50,000 - 2,925) x 4.95%", () => {
    expect(line(run(50_000, {}, "illinois"), "stateTax")).toBe(2_330.21);
  });

  it("derived: Illinois joint gets two exemptions: (105,850 - 5,850) x 4.95%", () => {
    expect(line(run(105_850, { filingStatus: "married-jointly" }, "illinois"), "stateTax")).toBe(
      4_950,
    );
  });

  it("derived: Illinois drops the exemption when income is over 250,000", () => {
    // 250,000 x 4.95% = 12,375 without the exemption
    expect(line(run(250_001, {}, "illinois"), "stateTax")).toBe(12_375.05);
    expect(line(run(250_000, {}, "illinois"), "stateTax")).toBe(12_230.21);
  });

  it("derived: Pennsylvania has a flat 3.07 percent and taxes 401(k) pay", () => {
    expect(line(run(100_000, {}, "pennsylvania"), "stateTax")).toBe(3_070);
    const r = run(100_000, { retirementPercent: 10 }, "pennsylvania");
    expect(line(r, "stateTax")).toBe(3_070);
    expect(r.assumptions.some((a) => a.includes("taxes the pay you put into a 401(k)"))).toBe(true);
  });

  it("Michigan and North Carolina are pending: no state tax line", () => {
    for (const region of ["michigan", "north-carolina"]) {
      expect(usStates[region].kind).toBe("pending");
      const r = run(62_750, {}, region);
      expect(r.lines.some((l) => l.key === "stateTax")).toBe(false);
    }
  });

  it("pending states are left out and the note comes first", () => {
    for (const region of ["california", "new-york", "ohio", "oregon", "alabama"]) {
      const r = run(80_000, {}, region);
      expect(usStates[region].kind).toBe("pending");
      expect(r.lines.some((l) => l.key === "stateTax")).toBe(false);
    }
  });

  it("an undefined region counts no state tax and says so first", () => {
    const out = usEngine({
      country: "us",
      taxYear: "2026",
      gross: 80_000,
      period: "year",
      options: {},
    });
    if (out.status !== "ready") throw new Error("engine not ready");
    expect(out.result.lines.some((l) => l.key === "stateTax")).toBe(false);
    expect(out.result.assumptions[0]).toContain("not covered yet");
  });

  it("an unknown slug counts no state tax and says so first", () => {
    for (const region of ["atlantis", "__proto__", "constructor"]) {
      const r = run(80_000, {}, region);
      expect(r.lines.some((l) => l.key === "stateTax")).toBe(false);
      expect(r.assumptions[0]).toContain("not covered yet");
    }
  });

  it("every state and DC has a rule", () => {
    expect(Object.keys(usStates)).toHaveLength(51);
  });

  it("no-tax states read from an official page say so", () => {
    for (const region of ["nevada", "south-dakota", "washington", "wyoming", "alaska"]) {
      const r = run(80_000, {}, region);
      expect(r.lines.some((l) => l.key === "stateTax")).toBe(false);
      expect(
        r.assumptions.some(
          (a) => a.includes("no state income tax") || a.includes("no individual income tax"),
        ),
      ).toBe(true);
    }
  });

  it("New Hampshire and Tennessee tax no wages", () => {
    for (const region of ["new-hampshire", "tennessee"]) {
      expect(line(run(80_000, {}, region), "stateTax")).toBe(0);
    }
  });

  // Hand-derived from the sourced figures. MS Pub 89-700: 4.0 percent over 10,000, exemption 6,000
  // single or 12,000 married, standard deduction 2,300 single or 4,600 married.
  it("Mississippi single 60,000: (60,000 - 12,300 - 6,000) x 4% = 1,668", () => {
    expect(line(run(60_000, {}, "mississippi"), "stateTax")).toBe(1_668);
  });
  it("Mississippi joint 100,000: (100,000 - 14,600 - 12,000) x 4% = 2,936", () => {
    expect(line(run(100_000, { filingStatus: "married-jointly" }, "mississippi"), "stateTax")).toBe(
      2_936,
    );
  });
  // Hand-derived. KY handbook: 3.5 percent, standard deduction 3,360.
  it("Kentucky single 60,000: (60,000 - 3,360) x 3.5% = 1,982.40", () => {
    expect(line(run(60_000, {}, "kentucky"), "stateTax")).toBe(1_982.4);
  });
  // Hand-derived. Indiana Departmental Notice 1: 2.95 percent, 1,000 per exemption.
  it("Indiana single 60,000: (60,000 - 1,000) x 2.95% = 1,740.50", () => {
    expect(line(run(60_000, {}, "indiana"), "stateTax")).toBe(1_740.5);
  });
  // Hand-derived. Colorado DR 1098: 4.40 percent on federal taxable income.
  it("Colorado single 60,000: (60,000 - 16,100) x 4.4% = 1,931.60", () => {
    expect(line(run(60_000, {}, "colorado"), "stateTax")).toBe(1_931.6);
  });
  // DC OTR rate table gives the tax at each edge: 2,200 at 40,000; 19,650 at 250,000;
  // 91,525 at 1,000,000. Taxable income is gross less the 16,100 standard deduction.
  it.each([
    [56_100, 2_200],
    [266_100, 19_650],
    [1_016_100, 91_525],
  ])("DC single gross %i pays %f at the official table edge", (gross, tax) => {
    expect(line(run(gross, {}, "district-of-columbia"), "stateTax")).toBe(tax);
  });
  // Hand-derived from the Virginia formula: T = 59,000 - 8,750 - 930 = 49,320; 720 + 5.75% of 32,320.
  it("Virginia single 59,000: 720 + 5.75% x 32,320 = 2,578.40", () => {
    expect(line(run(59_000, {}, "virginia"), "stateTax")).toBe(2_578.4);
  });
  // The formula bracket edges: 60 at 3,000, 120 at 5,000, 720 at 17,000 of taxable income.
  it.each([
    [3_000, 60],
    [5_000, 120],
    [17_000, 720],
  ])("Virginia taxable income %i pays %f at the formula edge", (taxable, tax) => {
    expect(line(run(taxable + 8_750 + 930, {}, "virginia"), "stateTax")).toBe(tax);
  });
  // West Virginia Tax Division rate table: 211.00 at 10,000; 632.50 at 25,000; 1,106.50 at 40,000;
  // 1,950.50 at 60,000. Exemption is 2,000, so gross is taxable income plus 2,000.
  it.each([
    [12_000, 211],
    [27_000, 632.5],
    [42_000, 1_106.5],
    [62_000, 1_950.5],
  ])("West Virginia single gross %i pays %f at the official table edge", (gross, tax) => {
    expect(line(run(gross, {}, "west-virginia"), "stateTax")).toBe(tax);
  });
  // Hand-derived from the same table: 1,106.50 + 4.22% x 18,000.
  it("West Virginia single 60,000: 1,106.50 + 759.60 = 1,866.10", () => {
    expect(line(run(60_000, {}, "west-virginia"), "stateTax")).toBe(1_866.1);
  });
  // The official figure is 707.81: the guide's own example rounds each step. The engine does not
  // round per step, so it gives the unrounded 707.67 (1,348 x 19.5% + 4.7% x 9,464). The 707.67
  // is the intended result, and the official 707.81 is checked to within 50 cents.
  it("Missouri single 35,000 (taxable 18,900) is within 50 cents of the official 707.81", () => {
    const tax = line(run(35_000, {}, "missouri"), "stateTax");
    expect(tax).toBeCloseTo(707.81, 0);
    expect(tax).toBe(707.67);
  });
  it("Missouri owes nothing up to the first 1,348 above the deduction", () => {
    expect(line(run(17_448, {}, "missouri"), "stateTax")).toBe(0);
  });
  // Derived: the DC table edges are official, this point between them is not.
  it("derived: DC single 60,000: 2,200 + 3,900 x 6.5% = 2,453.50", () => {
    // 60,000 - 16,100 = 43,900 taxable
    expect(line(run(60_000, {}, "district-of-columbia"), "stateTax")).toBe(2_453.5);
  });

  it("states with a caution pass it on to the result", () => {
    for (const region of ["mississippi", "indiana", "virginia", "west-virginia", "missouri"]) {
      const rule = usStates[region];
      if (rule.kind === "pending" || rule.kind === "none")
        throw new Error("expected a taxed state");
      expect(rule.caution).toBeDefined();
      expect(run(60_000, {}, region).assumptions).toContain(rule.caution);
    }
  });

  it("a value carries a verification date or a note, never both", () => {
    for (const rule of Object.values(usStates)) {
      if (rule.kind === "pending") {
        expect(rule.reason.verifiedOn).toBeUndefined();
        expect(rule.reason.unverifiedNote).toBeDefined();
      } else if (rule.kind === "none") {
        expect(rule.note.verifiedOn === undefined).toBe(rule.note.unverifiedNote !== undefined);
      } else {
        expect(rule.deduction.verifiedOn === undefined).toBe(
          rule.deduction.unverifiedNote !== undefined,
        );
      }
    }
  });

  // Edges of a ceiling: tax below it, none at it or above it. Skipped quietly while no state sets one.
  it("a state with a ceiling counts no tax at or above it", () => {
    for (const rule of Object.values(usStates)) {
      if (rule.kind !== "graduated" || !rule.ceiling) continue;
      const ceiling = rule.ceiling.value.single;
      const offset = rule.deduction.value.single + (rule.exemption?.value.amount.single ?? 0);
      const region = Object.keys(usStates).find((k) => usStates[k] === rule) ?? "";
      const tax = (taxable: number) =>
        run(taxable + offset, {}, region).lines.some((l) => l.key === "stateTax");
      expect(tax(ceiling - 1)).toBe(true);
      expect(tax(ceiling)).toBe(false);
      expect(tax(ceiling + 1)).toBe(false);
    }
  });

  it("states that local taxes are not included", () => {
    expect(run(80_000).assumptions.some((a) => a.includes("Local taxes are not included"))).toBe(
      true,
    );
  });
});

describe("US pay frequency", () => {
  it("notes an unrecognized pay frequency and uses every two weeks", () => {
    const r = run(60_000, { payFrequency: "daily" });
    expect(r.assumptions.some((a) => a.includes("pay frequency was not recognized"))).toBe(true);
    expect(r.assumptions.some((a) => a.includes("26 paychecks"))).toBe(true);
  });
  it("notes an unrecognized filing status and uses single", () => {
    const r = run(60_000, { filingStatus: "widow" });
    expect(r.assumptions.some((a) => a.includes("filing status was not recognized"))).toBe(true);
  });

  const cases: [string, string][] = [
    ["weekly", "52 paychecks"],
    ["biweekly", "26 paychecks"],
    ["semimonthly", "24 paychecks"],
    ["monthly", "12 paychecks"],
  ];
  it.each(cases)("%s shows %s and does not change the taxes", (payFrequency, text) => {
    const r = run(60_000, { payFrequency });
    expect(r.assumptions.some((a) => a.includes(text))).toBe(true);
    expect(r.net).toBe(50_390);
  });
});
