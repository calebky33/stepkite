import type { Activity, Job, StageRecord } from "./schema";

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

const live = (jobs: readonly Job[]): Job[] => jobs.filter((j) => !j.archivedAt);

function kindOf(job: Job, stages: readonly StageRecord[]): string | undefined {
  return stages.find((s) => s.id === job.stageId)?.kind;
}

/** Applications per week over the last `weeks` weeks. Null when nothing was ever applied for. */
export function applicationsPerWeek(
  jobs: readonly Job[],
  now: string,
  weeks: number,
): number | null {
  if (weeks <= 0) return null;
  const applied = live(jobs).filter((j) => j.appliedAt);
  if (applied.length === 0) return null;
  const n = Date.parse(now);
  const from = n - weeks * WEEK_MS;
  const inWindow = applied.filter((j) => {
    const t = Date.parse(j.appliedAt ?? "");
    return t >= from && t <= n;
  });
  return inWindow.length / weeks;
}

function share(
  jobs: readonly Job[],
  activities: readonly Activity[],
  stages: readonly StageRecord[],
  kinds: readonly string[],
): number | null {
  const applied = live(jobs).filter((j) => j.appliedAt);
  if (applied.length === 0) return null;
  const hadInterview = new Set(
    activities.filter((a) => a.type === "interview").map((a) => a.jobId),
  );
  const hits = applied.filter((j) => {
    const kind = kindOf(j, stages);
    return (kind !== undefined && kinds.includes(kind)) || hadInterview.has(j.id);
  });
  return hits.length / applied.length;
}

/**
 * Share of applied jobs that got past Applied. A job counts when its current stage is
 * screening, interview or offer, or when an interview was logged for it, so a job that was
 * rejected after an interview still counts. Stage history is not stored, so a job that
 * went to screening and was then closed does not count.
 */
export function responseRate(
  jobs: readonly Job[],
  activities: readonly Activity[],
  stages: readonly StageRecord[],
): number | null {
  return share(jobs, activities, stages, ["screening", "interview", "offer"]);
}

/** Share of applied jobs that reached an interview or an offer. */
export function interviewRate(
  jobs: readonly Job[],
  activities: readonly Activity[],
  stages: readonly StageRecord[],
): number | null {
  return share(jobs, activities, stages, ["interview", "offer"]);
}

export function offers(jobs: readonly Job[], stages: readonly StageRecord[]): number {
  return live(jobs).filter((j) => kindOf(j, stages) === "offer").length;
}

/** Average days the live jobs now in a stage have been there. Null when none are. */
export function timeInStage(
  jobs: readonly Job[],
  activities: readonly Activity[],
  stageId: string,
  now: string,
): number | null {
  const here = live(jobs).filter((j) => j.stageId === stageId);
  if (here.length === 0) return null;
  const n = Date.parse(now);
  const lastMove = new Map<string, number>();
  for (const a of activities) {
    if (a.type !== "moved" && a.type !== "applied") continue;
    const t = Date.parse(a.at);
    if (Number.isNaN(t)) continue;
    const prev = lastMove.get(a.jobId);
    if (prev === undefined || t > prev) lastMove.set(a.jobId, t);
  }
  const total = here.reduce((sum, job) => {
    const since = lastMove.get(job.id) ?? Date.parse(job.savedAt);
    return sum + Math.max(0, n - since) / DAY_MS;
  }, 0);
  return total / here.length;
}
