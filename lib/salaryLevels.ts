import type { CountryCode } from "@/lib/countries";

/** Gross amounts that get their own page under /salary-calculator. Page URLs only, not tax figures. */
export const SEO_SALARY_LEVELS: Record<CountryCode, readonly number[]> = {
  uk: [
    20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 70000, 80000, 90000, 100000,
    125000, 150000,
  ],
  us: [
    20000, 25000, 30000, 35000, 40000, 45000, 50000, 55000, 60000, 70000, 80000, 90000, 100000,
    125000, 150000,
  ],
  in: [300000, 500000, 700000, 1000000, 1500000, 2000000, 2500000, 3000000],
};
