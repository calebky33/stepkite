"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { COUNTRY_INFO, formatMoney, type CountryCode } from "@/lib/countries";
import { getRates } from "@/lib/tax";
import { MAX_GROSS, MIN_GROSS, type PayEngine } from "@/lib/tax/types";
import { InFields } from "./InFields";
import { buildOptions, DEFAULT_VALUES, type FieldValues } from "./options";
import { convertGross, PERIODS_PER_YEAR, type Period } from "./period";
import { NetBar, ResultCard, type ResultState } from "./ResultCard";
import { UkFields } from "./UkFields";
import { useEngine } from "./useEngine";
import { UsFields } from "./UsFields";

const PERIOD_WORD: Record<Period, string> = { year: "a year", month: "a month", week: "a week" };

/** Slider reach per country, in yearly terms. Input limits for the slider only, not tax figures. */
const SLIDER_YEARLY: Record<CountryCode, { max: number; step: number }> = {
  uk: { max: 150_000, step: 500 },
  us: { max: 300_000, step: 1_000 },
  in: { max: 5_000_000, step: 10_000 },
};

const COPY: Record<CountryCode, { label: string; hint: string }> = {
  uk: { label: "Salary before tax", hint: "Your gross pay, before tax and National Insurance." },
  us: { label: "Salary before taxes", hint: "Your gross pay, before taxes and deductions." },
  in: { label: "Salary before tax", hint: "Your gross pay or CTC, before tax and deductions." },
};

const FIELDS = { uk: UkFields, us: UsFields, in: InFields } as const;

function isValid(gross: number | null): gross is number {
  return gross !== null && gross >= MIN_GROSS && gross <= MAX_GROSS;
}

type Settled = { gross: number | null; values: FieldValues };

function compute(
  engine: PayEngine,
  country: CountryCode,
  gross: number,
  period: Period,
  values: FieldValues,
): ResultState {
  try {
    const built = buildOptions(country, values);
    const taxYear = getRates(country).taxYear;
    const outcome = engine({
      country,
      taxYear,
      gross,
      period,
      region: built.region,
      options: built.options,
    });
    if (outcome.status === "ready") return { kind: "ready", result: outcome.result, taxYear };
    return { kind: "rates-missing" };
  } catch {
    return { kind: "error" };
  }
}

type PayCalculatorProps = { country: CountryCode; initialGross?: number };

export function PayCalculator({ country, initialGross }: PayCalculatorProps) {
  const info = COUNTRY_INFO[country];
  const [gross, setGross] = useState<number | null>(
    initialGross ?? info.salaryLevels[2] ?? info.salaryLevels[0] ?? null,
  );
  const [edited, setEdited] = useState(false);
  const [period, setPeriod] = useState<Period>("year");
  const [values, setValues] = useState<FieldValues>(DEFAULT_VALUES[country]);
  const [settled, setSettled] = useState<Settled>({ gross, values });
  const engine = useEngine(country);

  // Results follow typing after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setSettled({ gross, values }), 150);
    return () => clearTimeout(id);
  }, [gross, values]);

  const pending = settled.gross !== gross || settled.values !== values;
  const typedInvalid = gross !== null && !isValid(gross);
  const error = typedInvalid
    ? `Enter a salary between ${formatMoney(MIN_GROSS, country)} and ${formatMoney(MAX_GROSS, country)}.`
    : undefined;

  const built = useMemo(() => buildOptions(country, values), [country, values]);
  const fieldsInvalid = Object.keys(built.errors).length > 0;

  const state: ResultState = useMemo(() => {
    if (engine.status === "loading" || pending) return { kind: "loading" };
    if (engine.status === "failed") return { kind: "error" };
    if (settled.gross === null) return { kind: "empty" };
    if (!isValid(settled.gross) || fieldsInvalid) return { kind: "invalid" };
    return compute(engine.engine, country, settled.gross, period, settled.values);
  }, [engine, pending, settled, fieldsInvalid, country, period]);

  const settledGross = isValid(settled.gross) ? settled.gross : null;
  const annual = settledGross === null ? null : settledGross * PERIODS_PER_YEAR[period];
  const entered =
    settledGross === null ? null : `${formatMoney(settledGross, country)} ${PERIOD_WORD[period]}`;

  const changeGross = (next: number | null) => {
    setEdited(true);
    setGross(next);
  };
  const changePeriod = (next: Period) => {
    setGross((current) => convertGross(current, period, next));
    setPeriod(next);
  };
  const Fields = FIELDS[country];
  const onField = (key: string, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const slider = SLIDER_YEARLY[country];
  const perYear = PERIODS_PER_YEAR[period];
  const sliderStep = Math.max(1, Math.round(slider.step / perYear));
  const sliderMax = Math.round(slider.max / perYear);
  const sliderValue = Math.min(Math.max(gross ?? sliderStep, sliderStep), sliderMax);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-6 md:p-8">
            <div className="flex min-h-6 items-center gap-2">
              {edited ? null : <Badge>Example</Badge>}
              {edited ? null : <p className="text-sm text-muted">Change it to your own salary.</p>}
            </div>
            <CurrencyInput
              label={COPY[country].label}
              hint={COPY[country].hint}
              error={error}
              locale={info.locale}
              currency={info.currency}
              value={gross}
              onValueChange={changeGross}
            />
            <Slider
              label="Adjust salary"
              min={sliderStep}
              max={sliderMax}
              step={sliderStep}
              value={sliderValue}
              valueText={formatMoney(sliderValue, country)}
              onValueChange={changeGross}
            />
            <SegmentedControl<Period>
              label="How often you're paid"
              value={period}
              onValueChange={changePeriod}
              options={[
                { value: "year", label: "Year" },
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
              ]}
            />
          </Card>
          <Card className="bg-surface md:p-8">
            <Fields values={values} errors={built.errors} onChange={onField} />
          </Card>
        </div>
        <div className="min-w-0 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-h)-3rem)] lg:overflow-y-auto lg:pr-1">
          <ResultCard
            country={country}
            state={state}
            annualGross={annual}
            entered={entered}
            example={!edited}
          />
        </div>
      </div>
      <NetBar country={country} state={state} />
    </div>
  );
}
