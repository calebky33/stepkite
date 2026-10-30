"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShareCard } from "@/components/shell/ShareCard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
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
import { getRates } from "@/lib/tax";
import type { PayResult } from "@/lib/tax/types";
import { Donut, type DonutSlice } from "./Donut";
import { mouseHover } from "./pointerHover";

export type ResultView = "year" | "month" | "week";

export type ResultState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "rates-missing" }
  | { kind: "ready"; result: PayResult; taxYear: string };

type ResultCardProps = {
  country: CountryCode;
  state: ResultState;
  /** Yearly gross for the share card. Null hides it. */
  annualGross: number | null;
  /** What the visitor typed, for example "£30,000 a year". */
  entered: string | null;
  /** True while the salary is the starting example, not something the visitor typed. */
  example: boolean;
};

const VIEW_WORD: Record<ResultView, string> = { year: "a year", month: "a month", week: "a week" };
const VIEW_DIVISOR: Record<ResultView, number> = { year: 1, month: 12, week: 52 };

/** Anchor for the sticky bar on small screens. */
export const BREAKDOWN_ID = "pay-breakdown";

const PENDING = "Pending";

type PlaceholderRow = { key: string; label: string };

function placeholderRows(country: CountryCode): PlaceholderRow[] {
  const info = COUNTRY_INFO[country];
  const social = { uk: "National Insurance", us: "Payroll tax", in: "Provident fund" }[country];
  const pension = country === "us" ? "401(k)" : "Pension";
  return [
    { key: "gross", label: "Pay before tax" },
    { key: "tax", label: "Income tax" },
    { key: "social", label: social },
    { key: "pension", label: pension },
    { key: "net", label: capitalise(info.takeHomeTerm) },
  ];
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Host plus the last path part, so two pages on one site read differently. */
function sourceLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");
    const page = pathname.split("/").filter(Boolean).pop();
    // Only a plain word slug reads well. File names and ids fall back to the host.
    return page && /^[a-z][a-z-]*$/.test(page) ? `${host}, ${page.replace(/-/g, " ")}` : host;
  } catch {
    return "official page";
  }
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function ResultCard({ country, state, annualGross, entered, example }: ResultCardProps) {
  const info = COUNTRY_INFO[country];
  const [view, setView] = useState<ResultView>("month");
  const [active, setActive] = useState<string | null>(null);
  const [counted, setCounted] = useState(false);
  const markCounted = useCallback(() => setCounted(true), []);
  const ready = state.kind === "ready";

  return (
    <Card
      className="flex min-h-112 scroll-mt-4 flex-col gap-8 p-6 shadow-card md:p-8 lg:min-h-160"
      id={BREAKDOWN_ID}
    >
      <SegmentedControl<ResultView>
        label="Show amounts per"
        value={view}
        onValueChange={setView}
        disabled={!ready}
        className="max-w-sm"
        options={[
          { value: "year", label: "Year" },
          { value: "month", label: "Month" },
          { value: "week", label: "Week" },
        ]}
      />
      {state.kind === "loading" ? (
        <ResultSkeleton />
      ) : (
        <>
          <div aria-live="polite" className="flex min-h-28 flex-col gap-2">
            {state.kind === "empty" ? (
              <p className="text-base text-muted">Type a salary to see your {info.takeHomeTerm}.</p>
            ) : null}
            {state.kind === "invalid" ? (
              <p className="text-base text-muted">
                Fix the salary to see your {info.takeHomeTerm}.
              </p>
            ) : null}
            {state.kind === "error" ? (
              <p role="alert" className="text-base text-danger">
                We couldn&apos;t work this out. Check the salary and try again.
              </p>
            ) : null}
            {state.kind === "rates-missing" ? (
              <MissingNotice country={country} entered={entered} example={example} />
            ) : null}
            {state.kind === "ready" ? (
              <ReadyHeadline
                country={country}
                view={view}
                result={state.result}
                animate={!counted}
                onCounted={markCounted}
              />
            ) : null}
          </div>
          <div className="flex flex-col items-center gap-6 border-t border-border pt-8 sm:flex-row sm:items-start sm:gap-8">
            <Donut
              slices={state.kind === "ready" ? slicesFor(state.result) : null}
              activeKey={active}
              onActiveChange={setActive}
              label="Where your pay goes"
            />
            <div className="w-full min-w-0 flex-1">
              {state.kind === "ready" ? (
                <ReadyTable
                  country={country}
                  view={view}
                  result={state.result}
                  active={active}
                  onActive={setActive}
                />
              ) : (
                <PendingTable country={country} view={view} />
              )}
            </div>
          </div>
          {state.kind === "ready" ? (
            <ReadyNotes
              state={state}
              ratesLoaded={getRates(country).loaded}
              verifiedOn={getRates(country).verifiedOn}
            />
          ) : null}
        </>
      )}
      {annualGross !== null && state.kind === "ready" ? (
        <ShareCard country={country} gross={annualGross} />
      ) : null}
      <Link
        href={`/${country}/cv`}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-input bg-primary px-4 py-2 text-base font-semibold text-primary-fg transition-[transform,scale,translate,opacity] duration-150 ease-[var(--ease-out)] active:scale-[0.97] hover:opacity-90 sm:w-fit"
      >
        Build a {info.cvName}
      </Link>
    </Card>
  );
}

function MissingNotice({
  country,
  entered,
  example,
}: {
  country: CountryCode;
  entered: string | null;
  example: boolean;
}) {
  const url = getRates(country).officialSources[0];
  const host = hostOf(url);
  return (
    <>
      {entered ? (
        <p className="flex flex-wrap items-center gap-2 text-base text-muted">
          {example ? <Badge>Example</Badge> : null}
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {example ? "Salary of" : "You entered"}{" "}
            <span className="font-semibold tabular-nums text-text">{entered}</span>.
          </span>
        </p>
      ) : null}
      <h2 className="font-display text-[22px]">Estimate. Rates not loaded yet.</h2>
      <p className="text-base">
        We show figures only once they are checked against the official source
        {host && url ? (
          <>
            {", "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center break-all text-primary underline-offset-4 hover:underline"
            >
              {host}
            </a>
          </>
        ) : null}
        .
      </p>
    </>
  );
}

function PendingTable({ country, view }: { country: CountryCode; view: ResultView }) {
  const rows = placeholderRows(country);
  const last = rows[rows.length - 1];
  const body = rows.slice(0, -1);
  return (
    <Table label={`Breakdown ${VIEW_WORD[view]}, figures pending`}>
      <TableHead>
        <tr>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell numeric>Amount</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        {body.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{row.label}</TableCell>
            <TableCell numeric className="text-muted">
              {PENDING}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {last ? (
        <TableFooter>
          <TableRow>
            <TableCell>{last.label}</TableCell>
            <TableCell numeric className="text-muted">
              {PENDING}
            </TableCell>
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  );
}

export function slicesFor(result: PayResult): DonutSlice[] {
  return [
    ...result.lines.map((line): DonutSlice => ({
      key: line.key,
      label: line.label,
      value: line.amount,
      tone: "tax",
    })),
    { key: "net", label: "Take-home", value: result.net, tone: "positive" },
  ];
}

function ReadyHeadline({
  country,
  view,
  result,
  animate,
  onCounted,
}: {
  country: CountryCode;
  view: ResultView;
  result: PayResult;
  animate: boolean;
  onCounted: () => void;
}) {
  const net = result.perPeriod[view];
  // Counts up once, on the first ready result. The hook jumps straight there under reduced motion.
  const [started, setStarted] = useState(!animate);
  useEffect(() => {
    if (!animate) return;
    const frame = requestAnimationFrame(() => setStarted(true));
    const id = setTimeout(onCounted, 250);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(id);
    };
  }, [animate, onCounted]);
  const tweened = useCountTween(started ? net : 0);
  const shown = animate ? tweened : net;

  return (
    <>
      <p className="text-sm font-medium text-muted">
        <span className="sr-only">
          You take home {formatMoney(net, country)} {VIEW_WORD[view]}.
        </span>
        <span aria-hidden="true">You take home</span>
      </p>
      <p
        aria-hidden="true"
        className="min-h-12 font-sans text-4xl leading-none font-semibold tracking-tight text-positive tabular-nums [overflow-wrap:anywhere] md:text-5xl"
      >
        {formatMoney(shown, country)}{" "}
        <span className="text-base font-normal tracking-normal text-muted">{VIEW_WORD[view]}</span>
      </p>
    </>
  );
}

function ReadyTable({
  country,
  view,
  result,
  active,
  onActive,
}: {
  country: CountryCode;
  view: ResultView;
  result: PayResult;
  active: string | null;
  onActive: (key: string | null) => void;
}) {
  const info = COUNTRY_INFO[country];
  const divisor = VIEW_DIVISOR[view];
  const hover = (key: string) => ({
    selected: active === key,
    ...mouseHover(
      () => onActive(key),
      () => onActive(null),
    ),
  });
  return (
    <Table label={`Breakdown for ${formatMoney(result.gross, country)} a year`}>
      <TableHead>
        <tr>
          <TableHeaderCell>Item</TableHeaderCell>
          <TableHeaderCell numeric>{capitalise(VIEW_WORD[view])}</TableHeaderCell>
        </tr>
      </TableHead>
      <TableBody>
        <TableRow {...hover("gross")}>
          <TableCell>Pay before tax</TableCell>
          <TableCell numeric>{formatMoney(result.gross / divisor, country)}</TableCell>
        </TableRow>
        {result.lines.map((line) => (
          <TableRow key={line.key} {...hover(line.key)}>
            <TableCell>{line.label}</TableCell>
            <TableCell numeric>{formatMoney(line.amount / divisor, country)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow {...hover("net")}>
          <TableCell>{capitalise(info.takeHomeTerm)}</TableCell>
          <TableCell numeric>{formatMoney(result.perPeriod[view], country)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

function ReadyNotes({
  state,
  ratesLoaded,
  verifiedOn,
}: {
  state: Extract<ResultState, { kind: "ready" }>;
  ratesLoaded: boolean;
  verifiedOn?: string;
}) {
  const checked = verifiedOn
    ? new Date(verifiedOn).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
  const sources = Array.from(
    new Map(state.result.lines.map((line) => [line.source, line.sourceLabel] as const)),
  );
  return (
    <div className="flex flex-col gap-2 rounded-input bg-surface-2 p-4">
      {state.result.assumptions.length > 0 ? (
        <ul className="list-disc pl-5 text-sm text-muted">
          {state.result.assumptions.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-muted">
        {ratesLoaded ? `Tax year ${state.taxYear}. ` : "Rates not loaded yet. "}
        {checked ? `Figures checked on ${checked}. ` : ""}This is an estimate. Your payslip may
        differ.
      </p>
      {sources.length > 0 ? (
        <ul className="flex flex-col text-sm">
          {sources.map(([url, label]) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center break-all text-primary underline-offset-4 hover:underline"
              >
                Source: {label ?? sourceLabel(url)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Same boxes as the final layout, so nothing moves when the engine arrives. */
function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-h-28 flex-col gap-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-64" />
      </div>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Skeleton className="size-40 shrink-0 rounded-full" />
        <div className="flex w-full flex-1 flex-col gap-1">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

type NetBarProps = { country: CountryCode; state: ResultState };

/** Sticky bar for small screens. Shows monthly take-home, or Pending until an engine is ready. */
export function NetBar({ country, state }: NetBarProps) {
  const info = COUNTRY_INFO[country];
  const month =
    state.kind === "ready" ? formatMoney(state.result.perPeriod.month, country) : PENDING;
  return (
    <div className="sticky bottom-[var(--consent-h,0px)] z-10 rounded-card border border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-bar lg:hidden">
      <a
        href={`#${BREAKDOWN_ID}`}
        className="flex min-h-11 items-center justify-between gap-4 text-base"
      >
        <span className="min-w-0 text-muted [overflow-wrap:anywhere]">
          {capitalise(info.takeHomeTerm)} a month
        </span>
        <span className="shrink-0 font-sans text-[22px] font-semibold tabular-nums">{month}</span>
      </a>
    </div>
  );
}
