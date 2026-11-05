import type { Metadata } from "next";
import { SEO_SALARY_LEVELS } from "@/lib/salaryLevels";

/**
 * Pages with no real content yet. They get noindex and stay out of sitemap.ts
 * until the real content lands, so thin pages are never indexed.
 */
export const STUB_ROBOTS: NonNullable<Metadata["robots"]> = { index: false, follow: true };

export function stubMetadata(meta: Metadata): Metadata {
  return { ...meta, robots: STUB_ROBOTS };
}

// Default to the live workers.dev deploy. Override with NEXT_PUBLIC_SITE_URL once the
// custom domain is DNS-live, so canonicals + sitemap stop pointing at a dead host.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://stepkite.calebky33.workers.dev";

/** Only pages with finished content. Add a route here in the same change that makes it real and removes its noindex. */
export const INDEXABLE_PATHS: readonly string[] = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/guides",
  "/guides/how-to-understand-your-uk-payslip",
  "/guides/how-us-federal-tax-brackets-work",
  "/guides/writing-a-cv-that-passes-ats-checks",
  "/uk/salary-calculator",
  // Salary level pages. US and India stay out until their rates are reviewed by hand.
  ...SEO_SALARY_LEVELS.uk.map((g) => `/uk/salary-calculator/${g}`),
];
