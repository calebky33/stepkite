import { dueInstant } from "./dates";
import type { Job } from "./schema";

function due(job: Job): number | null {
  if (job.archivedAt || !job.nextStep) return null;
  const t = dueInstant(job.nextStep.dueAt);
  return Number.isNaN(t) ? null : t;
}

function pick(jobs: readonly Job[], keep: (t: number) => boolean): Job[] {
  return jobs
    .map((job) => ({ job, t: due(job) }))
    .filter((x): x is { job: Job; t: number } => x.t !== null && keep(x.t))
    .sort((a, b) => a.t - b.t)
    .map((x) => x.job);
}

/** Live jobs whose next step is past due, oldest first. */
export function overdueJobs(jobs: readonly Job[], now: string): Job[] {
  const n = Date.parse(now);
  return pick(jobs, (t) => t < n);
}

/** Live jobs with a next step due now or later, soonest first. */
export function upcomingReminders(jobs: readonly Job[], now: string): Job[] {
  const n = Date.parse(now);
  return pick(jobs, (t) => t >= n);
}

export function orderedReminders(jobs: readonly Job[], now: string): Job[] {
  return [...overdueJobs(jobs, now), ...upcomingReminders(jobs, now)];
}
