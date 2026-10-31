import { z } from "zod";
import { DEFAULT_STAGES, activitySchema, contactSchema, interviewSchema, jobSchema, stageSchema } from "./schema";
import type { Activity, Contact, Interview, Job, StageRecord } from "./schema";

export const TRACKER_BACKUP_MAX_BYTES = 5 * 1024 * 1024;
const KIND = "stepkite-tracker-backup";

export type TrackerData = {
  jobs: Job[];
  stages: StageRecord[];
  activities: Activity[];
  interviews: Interview[];
  contacts: Contact[];
};

const backupSchema = z.object({
  kind: z.literal(KIND),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  jobs: z.array(jobSchema).max(5000),
  stages: z.array(stageSchema).max(50),
  activities: z.array(activitySchema).max(50_000),
  interviews: z.array(interviewSchema).max(10_000),
  contacts: z.array(contactSchema).max(5000),
  /** Raw rows the app could not read, kept so nothing is lost. Never restored as data. */
  unreadable: z.record(z.string(), z.array(z.unknown())).optional(),
});

export type BackupError = "too-big" | "not-json" | "wrong-shape" | "empty";

export const BACKUP_MESSAGES: Record<BackupError, string> = {
  "too-big": "That file is too large to be a tracker backup. Backups are under 5 MB.",
  "not-json": "We could not read that file. Choose a backup file you saved from Stepkite.",
  "wrong-shape":
    "That file is not a Stepkite tracker backup, or part of it is damaged. Nothing was changed.",
  empty: "That backup has nothing in it. Nothing was changed.",
};

/** What parseTrackerBackup changed to make the data consistent. */
export type BackupReport = {
  droppedDuplicates: number;
  /** Jobs whose stage was missing from the file and were moved to the saved (or first) stage. */
  remappedJobs: number;
  /** Jobs with neither a stage nor a stageId, placed in the saved stage by default. */
  defaultedStageJobs: number;
  /** True when the file had no stages and the default saved stage was added. */
  addedDefaultStage: boolean;
  prunedActivities: number;
  prunedInterviews: number;
  /** Contact links on jobs that pointed at a contact not in the file. */
  prunedContactLinks: number;
};

/**
 * Builds the backup text. `unreadable` carries rows the app could not read (for example the
 * skippedValues from readAll) so they travel with the file.
 */
export function buildTrackerBackup(
  data: TrackerData,
  now: Date,
  unreadable?: Record<string, readonly unknown[]>,
): string {
  const extra = unreadable && Object.values(unreadable).some((v) => v.length > 0);
  return JSON.stringify({
    kind: KIND,
    version: 1,
    exportedAt: now.toISOString(),
    ...data,
    ...(extra ? { unreadable } : {}),
  });
}

function unique<T extends { id: string }>(items: readonly T[]): { items: T[]; dropped: number } {
  const seen = new Set<string>();
  const out = items.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  return { items: out, dropped: items.length - out.length };
}

export type BackupParse =
  | { ok: true; data: TrackerData; report: BackupReport; unreadable: number }
  | {
      ok: false;
      error: BackupError;
      /** wrong-shape only: how many problems, and where the first one is. Never values. */
      issueCount?: number;
      firstPath?: string;
    };

/** Checks a backup file's text. Nothing is stored here. Pass file.size as `size` for a File. */
export function parseTrackerBackup(
  text: string,
  size: number = new TextEncoder().encode(text).length,
): BackupParse {
  if (size > TRACKER_BACKUP_MAX_BYTES) return { ok: false, error: "too-big" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: "wrong-shape",
      issueCount: parsed.error.issues.length,
      firstPath: first ? first.path.map(String).join(".") || "root" : "root",
    };
  }
  const d = parsed.data;
  const rawJobs = (raw as { jobs?: unknown }).jobs;
  const defaultedStageJobs = Array.isArray(rawJobs)
    ? rawJobs.filter(
        (j) =>
          typeof j === "object" && j !== null && !("stage" in j) && !("stageId" in j),
      ).length
    : 0;
  if (
    d.jobs.length === 0 &&
    d.stages.length === 0 &&
    d.activities.length === 0 &&
    d.interviews.length === 0 &&
    d.contacts.length === 0
  ) {
    return { ok: false, error: "empty" };
  }

  const jobsU = unique(d.jobs);
  const stagesU = unique(d.stages);
  const activitiesU = unique(d.activities);
  const interviewsU = unique(d.interviews);
  const contactsU = unique(d.contacts);
  const droppedDuplicates =
    jobsU.dropped + stagesU.dropped + activitiesU.dropped + interviewsU.dropped + contactsU.dropped;

  let stages = stagesU.items;
  let addedDefaultStage = false;
  const defaultSaved = DEFAULT_STAGES.find((s) => s.kind === "saved");
  if (stages.length === 0 && jobsU.items.length > 0 && defaultSaved) {
    stages = [defaultSaved];
    addedDefaultStage = true;
  }
  const stageIds = new Set(stages.map((s) => s.id));
  const byOrder = [...stages].sort((a, b) => a.order - b.order);
  const fallbackStage = byOrder.find((s) => s.kind === "saved") ?? byOrder[0];
  const contactIds = new Set(contactsU.items.map((c) => c.id));
  let remappedJobs = 0;
  let prunedContactLinks = 0;
  const jobs = jobsU.items.map((job) => {
    let next = job;
    if (fallbackStage && !stageIds.has(job.stageId)) {
      remappedJobs += 1;
      next = { ...next, stageId: fallbackStage.id };
    }
    if (next.contactIds) {
      const kept = next.contactIds.filter((id) => contactIds.has(id));
      if (kept.length !== next.contactIds.length) {
        prunedContactLinks += next.contactIds.length - kept.length;
        next = { ...next, contactIds: kept };
      }
    }
    return next;
  });
  const jobIds = new Set(jobs.map((j) => j.id));
  const activities = activitiesU.items.filter((a) => jobIds.has(a.jobId));
  const interviews = interviewsU.items.filter((i) => jobIds.has(i.jobId));

  return {
    ok: true,
    data: {
      jobs,
      stages,
      activities,
      interviews,
      contacts: contactsU.items,
    },
    report: {
      droppedDuplicates,
      remappedJobs,
      defaultedStageJobs,
      addedDefaultStage,
      prunedActivities: activitiesU.items.length - activities.length,
      prunedInterviews: interviewsU.items.length - interviews.length,
      prunedContactLinks,
    },
    unreadable: Object.values(d.unreadable ?? {}).reduce((n, v) => n + v.length, 0),
  };
}
