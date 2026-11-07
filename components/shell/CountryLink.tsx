"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useSavedCountry } from "@/lib/countryPreference";
import { COUNTRY_SHORT_NAME } from "@/lib/countries";

type CountryLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  /** Path inside the country, for example "/cv". Empty for the country hub. */
  path?: string;
};

/** A link into the visitor's remembered country. The route still carries the country code. */
export function CountryLink({ path = "", ...props }: CountryLinkProps) {
  const country = useSavedCountry();
  return <Link href={`/${country}${path}`} {...props} />;
}

/** The remembered country's short name, for places that show it as a value. */
export function SavedCountryName() {
  return <>{COUNTRY_SHORT_NAME[useSavedCountry()]}</>;
}
