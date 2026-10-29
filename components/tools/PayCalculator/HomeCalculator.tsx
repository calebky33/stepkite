"use client";

import Link from "next/link";
import { Tabs } from "@/components/ui/Tabs";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { PayCalculator } from "./PayCalculator";

const SHORT_NAME: Record<CountryCode, string> = { uk: "UK", us: "US", in: "India" };
const CODES: CountryCode[] = ["uk", "us", "in"];

/** The home page calculator with a country tab for each market. Starts on the UK. */
export function HomeCalculator() {
  return (
    <Tabs
      label="Country"
      defaultValue="uk"
      className="gap-8"
      tabs={CODES.map((code) => ({
        value: code,
        label: SHORT_NAME[code],
        content: (
          <div className="flex flex-col gap-8">
            <PayCalculator country={code} />
            <Link
              href={`/${code}`}
              className="inline-flex min-h-11 items-center self-start text-base text-primary underline-offset-4 hover:underline"
            >
              More about pay in {COUNTRY_INFO[code].name}
            </Link>
          </div>
        ),
      }))}
    />
  );
}
