import type { Activity, Job, StageRecord } from "./schema";

const NOTE_MAX = 1000;
const NAME_MAX = 40;

/** Moves a job to another stage. Null when the stage is unknown or unchanged. */
export function moveJob(
  job: Job,
  stageId: string,
  stages: readonly StageRecord[],
  now: string,
  activityId: string,
): { job: Job; activity: Activity } | null {
  const target = stages.find((s) => s.id === stageId);
  if (!target || job.stageId === stageId) return null;
  const firstApply = target.kind === "applied" && !job.appliedAt;
  // Skipping Applied (saved straight to interview) still means the person applied.
  const startsApplied = target.kind !== "saved" && !job.appliedAt;
  const from = stages.find((s) => s.id === job.stageId);
  const moved: Job = {
    ...job,
    stageId,
    appliedAt: startsApplied ? now : job.appliedAt,
    updatedAt: now,
  };
  const activity: Activity = {
    id: activityId,
    jobId: job.id,
    type: firstApply ? "applied" : "moved",
    text: from ? `${from.name} to ${target.name}` : target.name,
    at: now,
  };
  return { job: moved, activity };
}

export function addNote(jobId: string, text: string, now: string, id: string): Activity | null {
  const clean = text.trim();
  if (clean === "" || clean.length > NOTE_MAX) return null;
  return { id, jobId, type: "note", text: clean, at: now };
}

export function editActivity(list: readonly Activity[], id: string, text: string): Activity[] {
  const clean = text.trim();
  if (clean === "" || clean.length > NOTE_MAX) return [...list];
  return list.map((a) => (a.id === id ? { ...a, text: clean } : a));
}

export function deleteActivity(list: readonly Activity[], id: string): Activity[] {
  return list.filter((a) => a.id !== id);
}

export type SortKey = "title" | "company" | "savedAt" | "appliedAt" | "updatedAt";

function valueOf(job: Job, key: SortKey): string | undefined {
  const v = job[key];
  if (typeof v !== "string" || v === "") return undefined;
  return v;
}

/** Stable sort. Jobs missing the field go last in both directions. */
export function sortJobs(jobs: readonly Job[], key: SortKey, dir: "asc" | "desc"): Job[] {
  const sign = dir === "asc" ? 1 : -1;
  return jobs
    .map((job, index) => ({ job, index, v: valueOf(job, key) }))
    .sort((a, b) => {
      if (a.v === undefined && b.v === undefined) return a.index - b.index;
      if (a.v === undefined) return 1;
      if (b.v === undefined) return -1;
      const c = a.v.localeCompare(b.v, undefined, { sensitivity: "base", numeric: true });
      return c === 0 ? a.index - b.index : c * sign;
    })
    .map((x) => x.job);
}

function renumber(stages: readonly StageRecord[]): StageRecord[] {
  return stages.map((s, order) => ({ ...s, order }));
}

export function reorderStages(
  stages: readonly StageRecord[],
  id: string,
  toIndex: number,
): StageRecord[] {
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const from = sorted.findIndex((s) => s.id === id);
  if (from === -1) return [...stages];
  const [item] = sorted.splice(from, 1);
  if (!item) return [...stages];
  sorted.splice(Math.max(0, Math.min(toIndex, sorted.length)), 0, item);
  return renumber(sorted);
}

/** Why a stage name cannot be used, or null when it can. Names are compared ignoring case. */
export function stageNameProblem(
  stages: readonly StageRecord[],
  id: string,
  name: string,
): "empty" | "too-long" | "duplicate" | null {
  const clean = name.trim();
  if (clean === "") return "empty";
  if (clean.length > NAME_MAX) return "too-long";
  const lower = clean.toLowerCase();
  if (stages.some((s) => s.id !== id && s.name.trim().toLowerCase() === lower)) return "duplicate";
  return null;
}

export function renameStage(
  stages: readonly StageRecord[],
  id: string,
  name: string,
): StageRecord[] {
  if (stageNameProblem(stages, id, name) !== null) return [...stages];
  const clean = name.trim();
  return stages.map((s) => (s.id === id ? { ...s, name: clean } : s));
}

export function deleteStage(
  stages: readonly StageRecord[],
  id: string,
  jobs: readonly Job[],
): { ok: true; stages: StageRecord[] } | { ok: false; reason: "has-jobs" | "last-saved" } {
  const target = stages.find((s) => s.id === id);
  if (target?.kind === "saved" && stages.filter((s) => s.kind === "saved").length <= 1)
    return { ok: false, reason: "last-saved" };
  if (jobs.some((j) => j.stageId === id)) return { ok: false, reason: "has-jobs" };
  return { ok: true, stages: renumber(stages.filter((s) => s.id !== id)) };
}
