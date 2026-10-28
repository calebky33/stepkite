import { describe, expect, it } from "vitest";
import { GUIDES } from "@/content/guides";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { generateStaticParams as countries } from "./layout";
import { generateStaticParams as guideParams } from "./guides/[slug]/page";
import { generateStaticParams as regimeParams } from "./compare/regime/page";
import { generateStaticParams as salaryParams } from "./salary/[amount]/page";

describe("route params", () => {
  it("builds one page per country", () => {
    expect(countries().map((p) => p.country)).toEqual([...COUNTRIES]);
  });

  it("builds salary pages only for the listed levels", () => {
    const params = salaryParams();
    const expected = COUNTRIES.reduce((n, c) => n + COUNTRY_INFO[c].salaryLevels.length, 0);
    expect(params).toHaveLength(expected);
    expect(params).toContainEqual({ country: "uk", amount: "30000" });
    expect(params).not.toContainEqual({ country: "uk", amount: "500000" });
  });

  it("builds regime compare for India only", () => {
    expect(regimeParams()).toEqual([{ country: "in" }]);
  });

  it("builds one placeholder guide per country", () => {
    expect(guideParams()).toHaveLength(GUIDES.length);
    for (const country of COUNTRIES) {
      expect(GUIDES.filter((g) => g.country === country)).toHaveLength(1);
    }
  });
});
