import { notFound } from "next/navigation";
import { COUNTRIES, getCountry, isCountry, type CountryCode } from "@/lib/countries";

export type CountryParams = { country: string };

export function countryParams(): CountryParams[] {
  return COUNTRIES.map((country) => ({ country }));
}

/** Awaits the params promise and returns a valid country, or shows the not found page. */
export async function requireCountry(params: Promise<CountryParams>): Promise<CountryCode> {
  const { country } = await params;
  if (!isCountry(country)) notFound();
  return country;
}

/**
 * Every page a country hub links to, as path strings. Keep in step with the page files
 * under app/[country]; routes.test.ts checks that each one exists.
 */
export function countryRoutes(country: CountryCode): string[] {
  const base = `/${country}`;
  const info = getCountry(country);
  const routes = [`${base}/salary-calculator`];
  if (info?.tier === 1) {
    routes.push(...info.salaryLevels.map((amount) => `${base}/salary-calculator/${amount}`));
  }
  routes.push(`${base}/cv`, `${base}/tracker`, `${base}/match`);
  if (info?.tier === 1) {
    routes.push(`${base}/compare/offers`);
    if (country === "in") routes.push(`${base}/compare/regime`);
  }
  return routes;
}
