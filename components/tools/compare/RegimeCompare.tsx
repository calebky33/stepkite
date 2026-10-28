"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { COUNTRY_INFO, formatMoney } from "@/lib/countries";
import { useEngine } from "@/components/tools/PayCalculator/useEngine";
import { getRates } from "@/lib/tax";
import { MAX_GROSS, MIN_GROSS, type EngineOutcome, type PayEngine } from "@/lib/tax/types";

const REGIMES = [
  { key: "old", title: "Old regime" },
  { key: "new", title: "New regime" },
] as const;

function outcomeFor(
  engine: PayEngine | null,
  gross: number | null,
  regime: string,
): EngineOutcome | null {
  if (!engine || gross === null || gross < MIN_GROSS || gross > MAX_GROSS) return null;
  return engine({
    country: "in",
    taxYear: getRates("in").taxYear,
    gross,
    period: "year",
    options: { regime },
  });
}

/** Old and new regime side by side for India. Shows the engine outcome and no figures of its own. */
export function RegimeCompare() {
  const info = COUNTRY_INFO.in;
  const state = useEngine("in");
  const engine = state.status === "ready" ? state.engine : null;
  const [gross, setGross] = useState<number | null>(null);
  const error =
    gross !== null && (gross < MIN_GROSS || gross > MAX_GROSS)
      ? `Enter a salary between ${formatMoney(MIN_GROSS, "in")} and ${formatMoney(MAX_GROSS, "in")}.`
      : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Card className="max-w-md">
        <CurrencyInput
          label="Yearly salary before tax"
          hint="Use your CTC if that is the figure you have."
          locale={info.locale}
          currency={info.currency}
          value={gross}
          error={error}
          onValueChange={setGross}
        />
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        {REGIMES.map((regime) => {
          const outcome = outcomeFor(engine, gross, regime.key);
          return (
            <Card key={regime.key} className="flex min-h-40 flex-col gap-2">
              <h2 className="text-lg font-semibold">{regime.title}</h2>
              <p aria-live="polite" className="text-muted">
                {!outcome
                  ? "Enter a yearly salary to see this regime."
                  : outcome.status === "ready"
                    ? `Your in-hand salary is ${formatMoney(outcome.result.net, "in")} a year.`
                    : "The rates for this regime are still being checked against the official source."}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
