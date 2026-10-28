"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { COUNTRY_INFO, formatMoney, type CountryCode } from "@/lib/countries";
import { useEngine } from "@/components/tools/PayCalculator/useEngine";
import { getRates } from "@/lib/tax";
import { MAX_GROSS, MIN_GROSS, type EngineOutcome, type PayEngine } from "@/lib/tax/types";

type Offer = { name: "Offer A" | "Offer B"; gross: number | null };

function outcomeFor(
  engine: PayEngine | null,
  country: CountryCode,
  gross: number | null,
): EngineOutcome | null {
  if (!engine || gross === null || gross < MIN_GROSS || gross > MAX_GROSS) return null;
  return engine({
    country,
    taxYear: getRates(country).taxYear,
    gross,
    period: "year",
    options: {},
  });
}

function rangeError(gross: number | null, country: CountryCode): string | undefined {
  if (gross === null || (gross >= MIN_GROSS && gross <= MAX_GROSS)) return undefined;
  return `Enter a salary between ${formatMoney(MIN_GROSS, country)} and ${formatMoney(MAX_GROSS, country)}.`;
}

export function OfferCompare({ country }: { country: CountryCode }) {
  const info = COUNTRY_INFO[country];
  const [offers, setOffers] = useState<[Offer, Offer]>([
    { name: "Offer A", gross: null },
    { name: "Offer B", gross: null },
  ]);
  const state = useEngine(country);
  const engine = state.status === "ready" ? state.engine : null;
  const outcomes = offers.map((o) => outcomeFor(engine, country, o.gross));
  const [a, b] = outcomes;

  let difference: string;
  if (!a || !b) {
    difference = "Enter a yearly salary for both offers to compare them.";
  } else if (a.status === "ready" && b.status === "ready") {
    const gap = a.result.net - b.result.net;
    difference =
      gap === 0
        ? `Both offers leave you the same ${info.takeHomeTerm} each year.`
        : `${gap > 0 ? "Offer A" : "Offer B"} leaves you ${formatMoney(Math.abs(gap), country)} more ${info.takeHomeTerm} each year.`;
  } else {
    difference = `The difference appears once the ${info.name} rates are checked against the official source.`;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-2">
        {offers.map((offer, index) => (
          <Card key={offer.name} className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{offer.name}</h2>
            <CurrencyInput
              label="Yearly salary before tax"
              hint="Enter the figure on the offer letter."
              locale={info.locale}
              currency={info.currency}
              value={offer.gross}
              error={rangeError(offer.gross, country)}
              onValueChange={(gross) =>
                setOffers((current) => {
                  const next: [Offer, Offer] = [current[0], current[1]];
                  next[index] = { ...next[index]!, gross };
                  return next;
                })
              }
            />
          </Card>
        ))}
      </div>
      <Card role="region" aria-label="Difference" className="min-h-24">
        <h2 className="text-lg font-semibold">The difference</h2>
        <p aria-live="polite" className="mt-2 text-muted">
          {difference}
        </p>
      </Card>
    </div>
  );
}
