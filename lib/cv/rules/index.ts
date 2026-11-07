import { getCountry, type CountryCode } from "@/lib/countries";
import type { CvRules } from "./types";
import { ukCvRules } from "./uk";
import { usCvRules } from "./us";
import { inCvRules } from "./in";

const rules: Partial<Record<CountryCode, CvRules>> = { uk: ukCvRules, us: usCvRules, in: inCvRules };

/** Rules for a market with no researched conventions yet. English, no photo, no sensitive
 *  personal details. `verified` stays false until an official source is added. */
function defaultCvRules(country: CountryCode): CvRules {
  const info = getCountry(country);
  return {
    country,
    verified: false,
    maxPages: null,
    photo: "avoid",
    dateFormat: null,
    allowDateOfBirth: false,
    allowNationality: false,
    allowMaritalStatus: false,
    documentName: info?.cvName ?? "CV",
    paper: info?.paper ?? "A4",
    spelling: "en-GB",
    sources: [],
  };
}

export const getCvRules = (country: CountryCode): CvRules =>
  rules[country] ?? defaultCvRules(country);
export type { CvRules };
