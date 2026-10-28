"use client";

import { useEffect, useMemo, useState } from "react";
import { ShareCard } from "@/components/shell/ShareCard";
import { Card } from "@/components/ui/Card";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useCountTween } from "@/components/ui/useCountTween";
import { COUNTRY_INFO, formatMoney, type CountryCode } from "@/lib/countries";
import { getEngine, getRates } from "@/lib/tax";
import { MAX_GROSS, MIN_GROSS, type PayResult } from "@/lib/tax/types";

type Period = "year" | "month" | "week";

const PERIOD_WORD: Record<Period, string> = { year: "a year", month: "a month", week: "a week" };
const PERIODS_PER_YEAR: Record<Period, number> = { year: 1, month: 12, week: 52 };

const COPY: Record<CountryCode, { label: string; hint: string }> = {
  uk: { label: "Salary before tax", hint: "Your gross pay, before tax and National Insurance." },
  us: { label: "Salary before taxes", hint: "Your gross pay, before taxes and deductions." },
  in: { label: "Salary before tax", hint: "Your gross pay or CTC, before tax and deductions." },
};

type Computed =
  | { kind: "ready"; result: PayResult; taxYear: string }
  | { kind: "rates-missing"; reason: string }
  | { kind: "failed" };

function compute(country: CountryCode, gross: number, period: Period): Computed {
  try {
    const outcome = getEngine(country)({
      country,
      taxYear: getRates(country).taxYear,
      gross,
      period,
      options: {},
    });
    if (outcome.status === "ready") {
      return { kind: "ready", result: outcome.result, taxYear: getRates(country).taxYear };
    }
    return { kind: "rates-missing", reason: outcome.reason };
  } catch {
    return { kind: "failed" };
  }
}

function isValid(gross: number | null): gross is number {
  return gross !== null && gross >= MIN_GROSS && gross <= MAX_GROSS;
}

type PayCalculatorProps = { country: CountryCode; initialGross?: number };

export function PayCalculator({ country, initialGross }: PayCalculatorProps) {
  const info = COUNTRY_INFO[country];
  const [gross, setGross] = useState<number | null>(
    initialGross ?? info.salaryLevels[2] ?? info.salaryLevels[0] ?? null,
  );
  const [period, setPeriod] = useState<Period>("year");
  const [settled, setSettled] = useState(gross);

  // Results follow typing after a short pause.
  useEffect(() => {
    const id = setTimeout(() => setSettled(gross), 150);
    return () => clearTimeout(id);
  }, [gross]);

  const pending = gross !== settled;
  const typedInvalid = gross !== null && !isValid(gross);
  const error = typedInvalid
    ? `Enter a salary between ${formatMoney(MIN_GROSS, country)} and ${formatMoney(MAX_GROSS, country)}.`
    : undefined;

  const computed = useMemo(
    () => (isValid(settled) ? compute(country, settled, period) : null),
    [country, settled, period],
  );

  const annual = isValid(settled) ? settled * PERIODS_PER_YEAR[period] : null;
  const term = info.takeHomeTerm;

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
      <Card className="flex flex-col gap-4">
        <CurrencyInput
          label={COPY[country].label}
          hint={COPY[country].hint}
          error={error}
          locale={info.locale}
          currency={info.currency}
          value={gross}
          onValueChange={setGross}
        />
        <SegmentedControl<Period>
          label="How often you're paid"
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "year", label: "Year" },
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
          ]}
        />
      </Card>

      <Card className="flex min-h-80 flex-col gap-4 lg:sticky lg:top-6">
        <div aria-live="polite" aria-busy={pending} className="flex flex-col gap-4">
          {pending ? (
            <ResultSkeleton />
          ) : gross === null ? (
            <p className="text-base text-muted">Type a salary to see your {term}.</p>
          ) : typedInvalid ? (
            <p className="text-base text-muted">Fix the salary to see your {term}.</p>
          ) : computed?.kind === "ready" ? (
            <ReadyResult
              country={country}
              period={period}
              result={computed.result}
              taxYear={computed.taxYear}
            />
          ) : computed?.kind === "rates-missing" ? (
            <div className="flex flex-col gap-3">
              <p className="text-base text-muted">
                You entered{" "}
                <span className="font-semibold tabular-nums text-text">
                  {formatMoney(settled ?? 0, country)}
                </span>{" "}
                {PERIOD_WORD[period]}.
              </p>
              <h2 className="font-display text-[22px] font-extrabold">
                Your {term} isn&apos;t ready yet
              </h2>
              <p className="text-base">
                Figures arrive once the rates are checked against the official source. We won&apos;t
                show a number we haven&apos;t checked.
              </p>
              <p className="text-sm text-muted">{computed.reason}</p>
            </div>
          ) : (
            <p role="alert" className="text-base text-danger">
              We couldn&apos;t work this out. Check the salary and try again.
            </p>
          )}
        </div>
        {!pending && annual !== null && annual <= MAX_GROSS ? (
          <ShareCard country={country} gross={annual} />
        ) : null}
      </Card>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ReadyResult({
  country,
  period,
  result,
  taxYear,
}: {
  country: CountryCode;
  period: Period;
  result: PayResult;
  taxYear: string;
}) {
  const info = COUNTRY_INFO[country];
  const net = result.perPeriod[period];
  const shown = useCountTween(net);
  const sources = Array.from(new Set(result.lines.map((line) => line.source)));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base">
        <span className="sr-only">
          You take home {formatMoney(net, country)} {PERIOD_WORD[period]}.
        </span>
        <span aria-hidden="true">You take home</span>
      </p>
      <p
        aria-hidden="true"
        className="font-display text-4xl font-extrabold tabular-nums text-positive md:text-5xl"
      >
        {formatMoney(shown, country)}{" "}
        <span className="text-base font-normal text-muted">{PERIOD_WORD[period]}</span>
      </p>
      <Table label={`Breakdown for ${formatMoney(result.gross, country)} a year`}>
        <TableHead>
          <tr>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell numeric>Per year</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Pay before tax</TableCell>
            <TableCell numeric>{formatMoney(result.gross, country)}</TableCell>
          </TableRow>
          {result.lines.map((line) => (
            <TableRow key={line.key}>
              <TableCell>{line.label}</TableCell>
              <TableCell numeric>{formatMoney(line.amount, country)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>
              {info.takeHomeTerm.charAt(0).toUpperCase() + info.takeHomeTerm.slice(1)}
            </TableCell>
            <TableCell numeric>{formatMoney(result.net, country)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      <p className="text-base tabular-nums">
        That is {formatMoney(result.perPeriod.month, country)} a month and{" "}
        {formatMoney(result.perPeriod.week, country)} a week.
      </p>
      {result.assumptions.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-muted">
          {result.assumptions.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted">
        Tax year {taxYear}. This is an estimate. Your payslip may differ.
      </p>
      {sources.length > 0 ? (
        <ul className="flex flex-col text-sm">
          {sources.map((url) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-2"
              >
                Source: {new URL(url).hostname}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
