import { notFound } from "next/navigation";
import { COUNTRIES, isCountry, type CountryCode } from "@/lib/countries";

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
