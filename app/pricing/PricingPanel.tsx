"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { CountryCode } from "@/lib/countries";

/** Planned prices from docs/PRODUCT.md. Nothing can be bought yet. */
const PASS_PRICE: Record<CountryCode, string> = { uk: "£6", us: "$7", in: "₹299" };
/** Only the US annual price is planned so far. */
const ANNUAL_PRICE: Partial<Record<CountryCode, string>> = { us: "$39" };

const INCLUDED = [
  "Match your CV to a job ad, and approve every line before it changes",
  "Tailored CV versions for each application",
  "Cover letters",
  "Extra CV templates",
  "Sync between your devices",
  "No ads",
];

export function PricingPanel() {
  const [country, setCountry] = useState<CountryCode>("uk");
  const annual = ANNUAL_PRICE[country];

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:items-start">
      <Card className="flex flex-col gap-6">
        <SegmentedControl<CountryCode>
          label="Country"
          value={country}
          onValueChange={setCountry}
          className="max-w-sm"
          options={[
            { value: "uk", label: "UK" },
            { value: "us", label: "US" },
            { value: "in", label: "India" },
          ]}
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">Pro Pass</h2>
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-display text-5xl font-extrabold tabular-nums">
              {PASS_PRICE[country]}
            </span>
            <Badge tone="highlight">Planned price</Badge>
          </p>
          <p className="text-base text-muted">
            One payment for 30 days. It never renews by itself.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button disabled className="self-start">
            Pro Pass opens soon
          </Button>
          <p className="text-sm text-muted">Nothing can be bought yet, and nothing is charged.</p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6">
          <h2 className="text-base font-semibold">Annual plan, if you prefer it</h2>
          {annual ? (
            <p className="text-base text-muted">
              Planned at about {annual} a year, and only if you choose it. It would renew every
              year until you cancel.
            </p>
          ) : (
            <p className="text-base text-muted">
              The annual price for this country isn&apos;t set yet.
            </p>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">What the Pass is for</h2>
        <ul className="list-disc pl-5 text-base">
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          These tools are still being built, and the Pass opens when they are ready.
        </p>
      </Card>
    </div>
  );
}
