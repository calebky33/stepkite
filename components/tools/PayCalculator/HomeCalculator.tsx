"use client";

import Link from "next/link";
import { COUNTRY_SHORT_NAME } from "@/lib/countries";
import { useSavedCountry } from "@/lib/countryPreference";
import { PayCalculator } from "./PayCalculator";

/** The home page calculator. It follows the country chosen in the header. */
export function HomeCalculator() {
  const country = useSavedCountry();
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base text-muted" aria-live="polite">
        Showing {COUNTRY_SHORT_NAME[country]} rates. Change country in the header.
      </p>
      <PayCalculator key={country} country={country} />
      <Link
        href={`/${country}`}
        className="inline-flex min-h-11 items-center self-start text-base text-primary underline-offset-4 hover:underline"
      >
        More pay tools
      </Link>
    </div>
  );
}
