import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { loadEngine } from "@/lib/tax";
import type { PayResult } from "@/lib/tax/types";

import { SEO_SALARY_LEVELS } from "@/lib/salaryLevels";

export function salaryPagePaths(country: CountryCode): string[] {
  return SEO_SALARY_LEVELS[country].map((g) => `/${country}/salary-calculator/${g}`);
}

export const ALL_SALARY_PAGE_PATHS: readonly string[] = COUNTRIES.flatMap(salaryPagePaths);

/** Take-home for one salary with default options (single filer, England, new regime). Null when rates are missing. */
export async function computeSalary(
  country: CountryCode,
  gross: number,
): Promise<PayResult | null> {
  const engine = await loadEngine(country);
  const outcome = engine({
    country,
    taxYear: "2026",
    gross,
    period: "year",
    options: {},
    ...(country === "uk" ? { region: "england" } : {}),
  });
  return outcome.status === "ready" ? outcome.result : null;
}
