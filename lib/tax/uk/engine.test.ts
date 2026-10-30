import { describe, expect, it } from "vitest";
import type { PayInput, PayResult } from "../types";
import { parseTaxCode, ukEngine } from "./engine";

// gov.uk publishes rates, not full take home worked examples for 2026 to 27 (checked
// income-tax-rates, scottish-income-tax and the employer rates page; none
// has a worked salary example). Every expected value below is therefore derived by hand from
// the published rates, and the arithmetic is shown beside each test.
// Official bands: PA 12,570; rUK basic 20% to 50,270; higher 40% to 125,140; additional 45%;
// taper 1 pound per 2 pounds over 100,000; NI 8% from 12,570 to 50,270 then 2%.

function run(gross: number, extra: Partial<PayInput> = {}): PayResult {
  const out = ukEngine({
    country: "uk",
    taxYear: "2026",
    gross,
    period: "year",
    region: "england",
    options: {},
    ...extra,
  });
  if (out.status !== "ready") throw new Error("engine not ready");
  return out.result;
}

const line = (r: PayResult, key: string) => r.lines.find((l) => l.key === key)?.amount ?? 0;

describe("UK engine, rest of UK worked examples (hand derived)", () => {
  it("30,000: tax 17,430 x 20% = 3,486; NI 17,430 x 8% = 1,394.40", () => {
    const r = run(30_000);
    expect(line(r, "incomeTax")).toBe(3486);
    expect(line(r, "ni")).toBe(1394.4);
    expect(r.net).toBe(25_119.6);
    expect(r.perPeriod.month).toBe(2093.3);
    expect(r.perPeriod.week).toBe(483.07);
  });

  it("50,270 (top of basic): tax 37,700 x 20% = 7,540; NI 3,016", () => {
    const r = run(50_270);
    expect(line(r, "incomeTax")).toBe(7540);
    expect(line(r, "ni")).toBe(3016);
    expect(r.net).toBe(39_714);
  });

  it("60,000: tax 7,540 + 9,730 x 40% = 11,432; NI 3,016 + 9,730 x 2% = 3,210.60", () => {
    const r = run(60_000);
    expect(line(r, "incomeTax")).toBe(11_432);
    expect(line(r, "ni")).toBe(3210.6);
    expect(r.net).toBe(45_357.4);
  });

  it("100,000 (taper starts): tax 7,540 + 49,730 x 40% = 27,432; NI 4,010.60", () => {
    const r = run(100_000);
    expect(line(r, "incomeTax")).toBe(27_432);
    expect(line(r, "ni")).toBe(4010.6);
    expect(r.net).toBe(68_557.4);
  });

  it("110,000 (taper): allowance 12,570 - 5,000 = 7,570; tax 7,540 + 64,730 x 40% = 33,432", () => {
    const r = run(110_000);
    expect(line(r, "incomeTax")).toBe(33_432);
    expect(line(r, "ni")).toBe(4210.6);
    expect(r.net).toBe(72_357.4);
  });

  it("125,140 (allowance gone, all taxable): tax 7,540 + 87,440 x 40% = 42,516; NI 4,513.40", () => {
    const r = run(125_140);
    expect(line(r, "incomeTax")).toBe(42_516);
    expect(line(r, "ni")).toBe(4513.4);
    expect(r.net).toBe(78_110.6);
  });

  it("150,000 (additional rate): tax 42,516 + 24,860 x 45% = 53,703", () => {
    const r = run(150_000);
    expect(line(r, "incomeTax")).toBe(53_703);
    expect(line(r, "ni")).toBe(5010.6);
    expect(r.net).toBe(91_286.4);
  });
});

describe("UK engine, boundaries", () => {
  it("pay at the allowance and the NI threshold pays nothing", () => {
    const r = run(12_570);
    expect(line(r, "incomeTax")).toBe(0);
    expect(line(r, "ni")).toBe(0);
    expect(r.net).toBe(12_570);
  });

  it("1 pound over the allowance pays 20p tax and 8p NI", () => {
    const r = run(12_571);
    expect(line(r, "incomeTax")).toBe(0.2);
    expect(line(r, "ni")).toBe(0.08);
  });

  it("minimum pay of 1 pound pays nothing", () => {
    expect(run(1).net).toBe(1);
  });

  it("1 pound over the 50,270 limit is taxed at 40% and NI at 2%", () => {
    const r = run(50_271);
    expect(line(r, "incomeTax")).toBe(7540.4);
    expect(line(r, "ni")).toBe(3016.02);
  });

  it("one pound over the taper threshold lowers the allowance by 50p (rounded down to whole pounds)", () => {
    // 100,001: reduction 0.5 floors to 0, so allowance stays 12,570.
    expect(line(run(100_001), "incomeTax")).toBe(27_432.4);
    // 100,002: reduction 1, taxable 87,433 -> 7,540 + 49,733 x 40% = 27,433.20
    expect(line(run(100_002), "incomeTax")).toBe(27_433.2);
  });

  it("rejects zero and negative pay", () => {
    expect(() => run(0)).toThrow();
  });

  it("very high income: 10,000,000 tax and NI derived", () => {
    // 42,516 on the first 125,140 of taxable pay; rest (10,000,000 - 125,140) x 45%.
    const r = run(10_000_000);
    expect(line(r, "incomeTax")).toBe(round(42_516 + 9_874_860 * 0.45));
    // NI 3,016 + (10,000,000 - 50,270) x 2%
    expect(line(r, "ni")).toBe(round(3016 + 9_949_730 * 0.02));
  });

  it("converts monthly, weekly and hourly pay to a year", () => {
    expect(run(2500, { period: "month" }).net).toBe(25_119.6);
    expect(run(30_000 / 52, { period: "week" }).gross).toBe(30_000);
    const hourly = run(15, { period: "hour", hoursPerWeek: 40 });
    expect(hourly.gross).toBe(31_200);
  });
});

function round(n: number) {
  return Math.round(n * 100) / 100;
}

describe("UK engine, Scotland (hand derived from the published bands)", () => {
  // Taxable 17,430: 3,967 x 19% = 753.73; 12,989 x 20% = 2,597.80; 474 x 21% = 99.54 -> 3,451.07
  it("30,000", () => {
    const r = run(30_000, { region: "scotland" });
    expect(line(r, "incomeTax")).toBe(3451.07);
    expect(line(r, "ni")).toBe(1394.4);
    expect(r.net).toBe(25_154.53);
  });

  it("equal to rUK below the allowance", () => {
    expect(run(12_570, { region: "scotland" }).net).toBe(12_570);
  });

  it("125,140: no allowance, so taxable 125,140 fills starter to advanced; nothing at 48%", () => {
    // 3,967 x 19% + 12,989 x 20% + 14,136 x 21% + 31,338 x 42% + 62,710 x 45% = 47,701.55
    expect(line(run(125_140, { region: "scotland" }), "incomeTax")).toBe(47_701.55);
  });

  it("150,000: 47,701.55 + 24,860 x 48% = 59,634.35; NI 5,010.60", () => {
    const r = run(150_000, { region: "scotland" });
    expect(line(r, "incomeTax")).toBe(59_634.35);
    expect(r.net).toBe(85_355.05);
  });

  it("relief at source 60,000 at 5 percent widens the 20% band by 3,000", () => {
    // taxable 47,430: 3,967 x 19% = 753.73; 15,989 x 20% = 3,197.80; 14,136 x 21% = 2,968.56;
    // remaining 13,338 x 42% = 5,601.96 -> 12,522.05. NI 3,210.60. Pension cost 2,400.
    const r = run(60_000, {
      region: "scotland",
      options: { pensionPercent: 5, pensionType: "relief-at-source" },
    });
    expect(line(r, "incomeTax")).toBe(12_522.05);
    expect(r.net).toBe(41_867.35);
  });

  it("Wales and Northern Ireland use rUK bands", () => {
    expect(run(30_000, { region: "wales" }).net).toBe(25_119.6);
    expect(run(30_000, { region: "northern-ireland" }).net).toBe(25_119.6);
  });
});

describe("UK engine, student loans (threshold x 9%, postgraduate 6%)", () => {
  it("plan 2 at 40,000: (40,000 - 29,385) x 9% = 955.35", () => {
    const r = run(40_000, { options: { studentLoan: "plan-2" } });
    expect(line(r, "studentLoan")).toBe(955.35);
    expect(r.net).toBe(31_364.25);
  });

  it("each plan at 40,000", () => {
    expect(line(run(40_000, { options: { studentLoan: "plan-1" } }), "studentLoan")).toBe(1179);
    expect(line(run(40_000, { options: { studentLoan: "plan-4" } }), "studentLoan")).toBe(558.45);
    expect(line(run(40_000, { options: { studentLoan: "plan-5" } }), "studentLoan")).toBe(1350);
    expect(line(run(40_000, { options: { studentLoan: "postgraduate" } }), "studentLoan")).toBe(
      1140,
    );
  });

  it("nothing below the threshold, and none selected", () => {
    expect(line(run(29_385, { options: { studentLoan: "plan-2" } }), "studentLoan")).toBe(0);
    expect(line(run(40_000, { options: { studentLoan: "none" } }), "studentLoan")).toBe(0);
    // Inherited object keys must not count as a plan.
    const odd = run(40_000, { options: { studentLoan: "toString" } });
    expect(line(odd, "studentLoan")).toBe(0);
    expect(Number.isFinite(odd.net)).toBe(true);
  });
});

describe("UK engine, pensions at 5 percent", () => {
  it("net pay on 40,000: tax 5,086, NI on full pay 2,194.40", () => {
    const r = run(40_000, { options: { pensionPercent: 5, pensionType: "net-pay" } });
    expect(line(r, "incomeTax")).toBe(5086);
    expect(line(r, "ni")).toBe(2194.4);
    expect(r.net).toBe(30_719.6);
  });

  it("salary sacrifice on 40,000: NI on 38,000 = 2,034.40", () => {
    const r = run(40_000, { options: { pensionPercent: 5, pensionType: "salary-sacrifice" } });
    expect(line(r, "incomeTax")).toBe(5086);
    expect(line(r, "ni")).toBe(2034.4);
    expect(r.net).toBe(30_879.6);
  });

  it("relief at source on 60,000: basic band widens by 3,000; you pay 2,400", () => {
    // taxable 47,430: 40,700 x 20% = 8,140 + 6,730 x 40% = 2,692 -> 10,832
    const r = run(60_000, { options: { pensionPercent: 5, pensionType: "relief-at-source" } });
    expect(line(r, "incomeTax")).toBe(10_832);
    expect(line(r, "pension")).toBe(2400);
    expect(r.net).toBe(43_557.4);
  });

  it("pension pulls income under the taper threshold (net pay, 110,000, 10 percent)", () => {
    // pension 11,000, income for tax 99,000, no taper: taxable 86,430 -> 7,540 + 48,730 x 40% = 27,032
    const r = run(110_000, { options: { pensionPercent: 10, pensionType: "net-pay" } });
    expect(line(r, "incomeTax")).toBe(27_032);
  });
});

describe("UK engine, tax code override", () => {
  it("1257L matches the default", () => {
    expect(run(30_000, { options: { taxCode: "1257L" } }).net).toBe(25_119.6);
  });

  it("rate codes such as BR are not supported and fall back with a note", () => {
    const r = run(30_000, { options: { taxCode: "BR" } });
    expect(line(r, "incomeTax")).toBe(3486);
    expect(r.assumptions.some((a) => a.includes("not supported"))).toBe(true);
  });

  it("K code adds to taxable pay: K100 on 30,000 taxes 31,000", () => {
    expect(line(run(30_000, { options: { taxCode: "K100" } }), "incomeTax")).toBe(6200);
  });

  it("NT pays no tax; unknown code falls back with a note", () => {
    expect(line(run(30_000, { options: { taxCode: "NT" } }), "incomeTax")).toBe(0);
    const r = run(30_000, { options: { taxCode: "zzz" } });
    expect(line(r, "incomeTax")).toBe(3486);
    expect(r.assumptions.some((a) => a.includes("not recognised"))).toBe(true);
  });

  it("parses codes", () => {
    expect(parseTaxCode("S1257L")).toEqual({ kind: "allowance", allowance: 12_570 });
    expect(parseTaxCode("0T")).toEqual({ kind: "allowance", allowance: 0 });
    expect(parseTaxCode("nope")).toBeNull();
  });
});

describe("UK engine, output shape", () => {
  it("lists assumptions and balances", () => {
    const r = run(45_000, {
      options: { studentLoan: "plan-1", pensionPercent: 3, pensionType: "net-pay" },
    });
    expect(r.assumptions.length).toBeGreaterThan(2);
    const sum = r.lines.reduce((s, l) => s + l.amount, 0);
    expect(round(r.gross - sum)).toBe(r.net);
    for (const l of r.lines) expect(l.source).toMatch(/^https:\/\/www\.gov\.uk\//);
  });
});

describe("UK engine, official gov.uk worked examples", () => {
  // https://www.gov.uk/income-tax-rates/previous-tax-years (2025 to 2026): 35,000 income, standard
  // allowance 12,570, "basic rate tax at 20% on 22,430". Bands and allowance are unchanged for 2026 to 27.
  it("35,000 income: 22,430 taxed at 20% gives 4,486", () => {
    expect(line(run(35_000), "incomeTax")).toBe(4486);
  });

  // https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief (2024 to 2025 example, same
  // bands): earn 60,270, 12,000 into relief at source, extra 20% relief on the 10,000 taxed at 40%.
  // Tax without the pension 7,540 + 10,000 x 40% = 11,540; with it all 47,700 taxable is at 20% = 9,540,
  // a saving of 2,000 (20% of 10,000).
  it("60,270 with 12,000 relief at source saves 2,000 of higher rate tax", () => {
    const withPension = run(60_270, {
      options: { pensionPercent: (12_000 / 60_270) * 100, pensionType: "relief-at-source" },
    });
    const without = run(60_270);
    expect(line(without, "incomeTax")).toBe(11_540);
    expect(line(withPension, "incomeTax")).toBe(9540);
    expect(line(without, "incomeTax") - line(withPension, "incomeTax")).toBe(2000);
  });
});
