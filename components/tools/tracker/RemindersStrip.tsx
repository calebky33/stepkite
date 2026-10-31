"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CountryCode } from "@/lib/countries";
import { upcomingInterviews } from "@/lib/tracker/interviews";
import { overdueJobs, upcomingReminders } from "@/lib/tracker/reminders";
import type { Interview, Job } from "@/lib/tracker/schema";
import { formatWhen } from "./format";

const SHOWN = 5;

type Item = {
  key: string;
  job: Job;
  when: string;
  label: string;
  overdue: boolean;
};

type Props = {
  jobs: readonly Job[];
  interviews: readonly Interview[];
  now: string;
  country: CountryCode;
  onOpen: (job: Job) => void;
};

/** Overdue next steps first, then upcoming interviews and next steps, soonest first. */
export function buildReminders(
  jobs: readonly Job[],
  interviews: readonly Interview[],
  now: string,
): Item[] {
  const live = jobs.filter((j) => !j.archivedAt);
  const byId = new Map(live.map((j) => [j.id, j]));
  const overdue: Item[] = overdueJobs(live, now).flatMap((job) =>
    job.nextStep
      ? [{ key: `s-${job.id}`, job, when: job.nextStep.dueAt, label: job.nextStep.text, overdue: true }]
      : [],
  );
  const steps: Item[] = upcomingReminders(live, now).flatMap((job) =>
    job.nextStep
      ? [{ key: `s-${job.id}`, job, when: job.nextStep.dueAt, label: job.nextStep.text, overdue: false }]
      : [],
  );
  const talks: Item[] = upcomingInterviews(interviews, now).flatMap((iv) => {
    const job = byId.get(iv.jobId);
    return job ? [{ key: `i-${iv.id}`, job, when: iv.at, label: "Interview", overdue: false }] : [];
  });
  const later = [...steps, ...talks].sort((a, b) => Date.parse(a.when) - Date.parse(b.when));
  return [...overdue, ...later];
}

export function RemindersStrip({ jobs, interviews, now, country, onOpen }: Props) {
  const [all, setAll] = useState(false);
  const items = buildReminders(jobs, interviews, now);
  const shown = all ? items : items.slice(0, SHOWN);
  return (
    <section aria-labelledby="reminders-heading" className="flex min-w-0 flex-col gap-3">
      <h2 id="reminders-heading" className="font-display text-[22px] leading-tight">
        Coming up
      </h2>
      {items.length === 0 ? (
        <p className="text-muted">
          Nothing due. Add a next step or an interview to a job and it shows here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface">
          {shown.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onOpen(item.job)}
                data-open-job={item.job.id}
                className="flex min-h-11 w-full min-w-0 flex-col gap-1 px-4 py-3 text-left hover:bg-surface-2 md:flex-row md:items-center md:gap-3"
              >
                {item.overdue ? <Badge tone="highlight">Overdue</Badge> : null}
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                  <span className="font-semibold">{item.job.title}</span>
                  {item.job.company ? `, ${item.job.company}` : ""}
                  <span className="text-muted">{`. ${item.label}`}</span>
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {formatWhen(item.when, country, true)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > SHOWN ? (
        <Button variant="secondary" className="self-start" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </Button>
      ) : null}
    </section>
  );
}
