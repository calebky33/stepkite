import type { CountryCode } from "@/lib/countries";
import type { CvRules } from "./types";
import { ukCvRules } from "./uk";
import { usCvRules } from "./us";
import { inCvRules } from "./in";

const rules: Record<CountryCode, CvRules> = { uk: ukCvRules, us: usCvRules, in: inCvRules };

export const getCvRules = (country: CountryCode): CvRules => rules[country];
export type { CvRules };
