"use client";

import { Card } from "@/components/ui/Card";
import {
  applicationsPerWeek,
  interviewRate,
  offers,
  responseRate,
  timeInStage,
} from "@/lib/tracker/metrics";
import { useNow } from "./useNow";
import type { Tracker } from "./useTracker";

export const NO_DATA = "Not enough data yet";
const WINDOW_WEEKS = 4;

const percent = (v: number | null) => (v === null ? NO_DATA : `${Math.round(v * 100)}%`);

function perWeek(v: number | null): string {
  return v === null ? NO_DATA : `${v.toFixed(1)} a week`;
}

function days(v: number | null): string {
  if (v === null) return NO_DATA;
  const rounded = Math.round(v * 10) / 10;
  return rounded === 1 ? "1 day" : `${rounded.toFixed(1)} days`;
}

/** Every figure comes from lib/tracker/metrics.ts and your own entries. Nothing is compared to other people. */
export function MetricsView({ t }: { t: Tracker }) {
  const now = useNow();
  const { jobs, activities, stages } = t.data;
  const rows: { label: string; note: string; value: string }[] = [
    {
      label: "Applications",
      note: `Average over the last ${WINDOW_WEEKS} weeks.`,
      value: perWeek(applicationsPerWeek(jobs, now, WINDOW_WEEKS)),
    },
    {
      label: "Response rate",
      note: "Jobs you applied for that moved past Applied.",
      value: percent(responseRate(jobs, activities, stages)),
    },
    {
      label: "Interview rate",
      note: "Jobs you applied for that reached an interview or an offer.",
      value: percent(interviewRate(jobs, activities, stages)),
    },
    {
      label: "Offers",
      note: "Jobs now in an offer stage.",
      value: String(offers(jobs, stages)),
    },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <p className="max-w-prose text-muted">
        These figures are worked out on this device from the jobs you have entered. Archived jobs
        are left out.
      </p>
      <Card className="p-0">
        <dl aria-live="polite" className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex min-w-0 flex-col gap-1 p-4 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6"
            >
              <div className="min-w-0">
                <dt className="font-semibold">{r.label}</dt>
                <p className="text-sm text-muted">{r.note}</p>
              </div>
              <dd className="text-2xl font-semibold tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <section aria-labelledby="time-heading" className="flex min-w-0 flex-col gap-3">
        <h3 id="time-heading" className="font-display text-xl">
          Time in each stage
        </h3>
        <p className="text-muted">Average days the jobs now in a stage have been there.</p>
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface px-4">
          {stages.map((s) => (
            <li
              key={s.id}
              className="flex min-h-11 min-w-0 items-center justify-between gap-4 py-3"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{s.name}</span>
              <span className="shrink-0 tabular-nums">
                {days(timeInStage(jobs, activities, s.id, now))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
