import { describe, expect, it } from "vitest";
import { COUNTRIES, COUNTRY_INFO, hasTaxEngine, isTaxCountry, type CountryCode } from "./countries";

// Compile-time exhaustive: adding a code to CountryCode without listing it here fails typecheck.
const EVERY_CODE: Record<CountryCode, true> = {
  uk: true,
  us: true,
  in: true,
  ca: true,
  au: true,
  nz: true,
  ie: true,
  qa: true,
  ae: true,
  sa: true,
  kw: true,
  bh: true,
  om: true,
  sg: true,
  za: true,
  ke: true,
  ng: true,
  gh: true,
  ph: true,
  my: true,
  nl: true,
  de: true,
  se: true,
};

describe("country registry", () => {
  it("has one registry entry for every CountryCode, and no extras", () => {
    expect([...COUNTRIES].sort()).toEqual(Object.keys(EVERY_CODE).sort());
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    for (const code of COUNTRIES) expect(COUNTRY_INFO[code].code).toBe(code);
  });

  it("keeps TaxCountry in step with the tier 1 entries", () => {
    const tier1 = COUNTRIES.filter((c) => COUNTRY_INFO[c].tier === 1).sort();
    expect(COUNTRIES.filter(isTaxCountry).sort()).toEqual(tier1);
    for (const code of COUNTRIES) expect(isTaxCountry(code)).toBe(hasTaxEngine(code));
  });

  it("gives tier 2 markets no salary levels", () => {
    for (const code of COUNTRIES) {
      if (COUNTRY_INFO[code].tier === 2) expect(COUNTRY_INFO[code].salaryLevels).toEqual([]);
    }
  });
});
