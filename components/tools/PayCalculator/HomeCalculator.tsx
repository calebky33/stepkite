"use client";

import Link from "next/link";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { PayCalculator } from "./PayCalculator";

const SHORT_NAME: Record<CountryCode, string> = { uk: "UK", us: "US", in: "India" };

/** The home page calculator with a country picker. Starts on the UK. */
export function HomeCalculator() {
  const [country, setCountry] = useState<CountryCode>("uk");
  const info = COUNTRY_INFO[country];

  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl<CountryCode>
        label="Country"
        value={country}
        onValueChange={setCountry}
        className="max-w-sm"
        options={[
          { value: "uk", label: SHORT_NAME.uk },
          { value: "us", label: SHORT_NAME.us },
          { value: "in", label: SHORT_NAME.in },
        ]}
      />
      <PayCalculator key={country} country={country} />
      <div className="flex flex-wrap gap-x-6">
        <Link
          href={`/${country}`}
          className="inline-flex min-h-11 items-center text-base text-primary underline underline-offset-2"
        >
          More about pay in {info.name}
        </Link>
      </div>
    </div>
  );
}
