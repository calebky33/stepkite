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
  const routes: string[] = [];
  if (info?.tier === 1) {
    routes.push(
      `${base}/salary-calculator`,
      ...info.salaryLevels.map((amount) => `${base}/salary-calculator/${amount}`),
    );
  }
  routes.push(`${base}/cv`, `${base}/tracker`, `${base}/match`);
  if (info?.tier === 1) {
    routes.push(`${base}/compare/offers`);
    if (country === "in") routes.push(`${base}/compare/regime`);
  }
  return routes;
}

/** The same page in another country when that route exists, else the country hub. */
export function pathForCountry(pathname: string, target: CountryCode): string {
  const [, first = "", ...rest] = pathname.split("/");
  if (!isCountry(first) || rest.length === 0 || rest.every((part) => part === "")) {
    return `/${target}`;
  }
  const candidate = `/${target}/${rest.join("/")}`;
  return countryRoutes(target).includes(candidate) ? candidate : `/${target}`;
}

/**
 * Where a signed-in user with a home market goes when they open another market's page. Null
 * when the path is not a market page or is already in their market.
 */
export function homeCountryRedirect(pathname: string, home: CountryCode): string | null {
  const first = pathname.split("/")[1] ?? "";
  if (!isCountry(first) || first === home) return null;
  return pathForCountry(pathname, home);
}
