"use client";

import Link from "next/link";
import { useState } from "react";
import { Tabs } from "@/components/ui/Tabs";
import { COUNTRY_SHORT_NAME, isCountry, type CountryCode } from "@/lib/countries";
import { useSavedCountry } from "@/lib/countryPreference";
import { PayCalculator } from "./PayCalculator";

const CODES: CountryCode[] = ["uk", "us", "in"];

/** The home page calculator with a country tab for each market. Opens on the saved country. */
export function HomeCalculator() {
  const saved = useSavedCountry();
  // A tab the visitor picks wins over the saved country until they leave the page.
  const [picked, setPicked] = useState<CountryCode | null>(null);
  return (
    <Tabs
      label="Country"
      value={picked ?? saved}
      onValueChange={(value) => {
        if (isCountry(value)) setPicked(value);
      }}
      className="gap-8"
      tabs={CODES.map((code) => ({
        value: code,
        label: COUNTRY_SHORT_NAME[code],
        content: (
          <div className="flex flex-col gap-8">
            <PayCalculator country={code} />
            <Link
              href={`/${code}`}
              className="inline-flex min-h-11 items-center self-start text-base text-primary underline-offset-4 hover:underline"
            >
              More pay tools
            </Link>
          </div>
        ),
      }))}
    />
  );
}
