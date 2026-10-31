import { z } from "zod";
import {
  readAll,
  removeItem,
  writeItem,
  type Collection,
  type StorageResult,
} from "@/lib/storage/db";
import type { TrackerData } from "@/lib/tracker/backup";
import { migrateJobResult } from "@/lib/tracker/migrate";
import { quarantineEntries, saveQuarantine } from "@/lib/tracker/quarantine";
import {
  DEFAULT_STAGES,
  activitySchema,
  contactSchema,
  interviewSchema,
  jobSchema,
  stageSchema,
} from "@/lib/tracker/schema";

/** Reads a stored job in either shape. Rows that cannot be migrated count as unreadable. */
const storedJob = z.unknown().transform((raw, ctx) => {
  const result = migrateJobResult(raw);
  if (!result.ok) {
    ctx.addIssue({ code: "custom", message: "unreadable" });
    return z.NEVER;
  }
  return result.job;
});

export type Loaded = {
  data: TrackerData;
  unreadable: number;
  /** The raw rows that could not be read, kept so a backup can carry them. */
  unreadableRows: Record<string, unknown[]>;
  /** Copies of unreadable rows that could not be kept in quarantine. */
  quarantineFailed: number;
  /** Unreadable rows past the cap that were not copied. The originals are untouched. */
  quarantineDropped: number;
};

/** A stable id for a row from its SHA-256, so the same bad row is only copied once. */
async function fingerprint(raw: unknown): Promise<string> {
  let text = "";
  try {
    text = JSON.stringify(raw) ?? "";
  } catch {
    text = "";
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Most copies kept per load, so a damaged store cannot fill the device. */
export const QUARANTINE_CAP = 200;

/** Why a save failed. "full" and "unavailable" each get their own message. */
export type SaveProblem = "unavailable" | "full" | "error";

/** Why nothing could be read: no storage here, or storage that failed. */
export type LoadFailure = "unavailable" | "error";

export async function loadTracker(): Promise<
  { ok: true; value: Loaded } | { ok: false; reason: LoadFailure }
> {
  const [jobs, stages, activities, interviews, contacts] = await Promise.all([
    readAll("jobs", storedJob),
    readAll("tracker-stages", stageSchema),
    readAll("tracker-activity", activitySchema),
    readAll("tracker-interviews", interviewSchema),
    readAll("tracker-contacts", contactSchema),
  ]);
  const all = [jobs, stages, activities, interviews, contacts];
  const failed = all.find((r) => !r.ok);
  if (failed && !failed.ok) {
    return { ok: false, reason: failed.reason === "unavailable" ? "unavailable" : "error" };
  }
  if (!jobs.ok || !stages.ok || !activities.ok || !interviews.ok || !contacts.ok) {
    return { ok: false, reason: "error" };
  }
  const unreadableRows: Record<string, unknown[]> = {
    jobs: jobs.value.skippedValues,
    stages: stages.value.skippedValues,
    activities: activities.value.skippedValues,
    interviews: interviews.value.skippedValues,
    contacts: contacts.value.skippedValues,
  };
  const now = new Date().toISOString();
  let quarantineFailed = 0;
  let quarantineDropped = 0;
  let room = QUARANTINE_CAP;
  for (const [from, all] of Object.entries(unreadableRows)) {
    if (all.length === 0) continue;
    const raws = all.slice(0, room);
    quarantineDropped += all.length - raws.length;
    room -= raws.length;
    const ids = await Promise.all(raws.map((r) => fingerprint(r)));
    // Copies only. The originals stay where they are.
    const entries = quarantineEntries(from, raws, now, (i) => ids[i] ?? String(i));
    quarantineFailed += (await saveQuarantine(entries)).failed;
  }
  const stored = [...stages.value.items].sort((a, b) => a.order - b.order);
  return {
    ok: true,
    value: {
      data: {
        jobs: jobs.value.items,
        stages: stored.length > 0 ? stored : DEFAULT_STAGES.map((st) => ({ ...st })),
        activities: activities.value.items,
        interviews: interviews.value.items,
        contacts: contacts.value.items,
      },
      unreadable: all.reduce((n, r) => n + (r.ok ? r.value.skipped : 0), 0),
      unreadableRows,
      quarantineFailed,
      quarantineDropped,
    },
  };
}

export function problemOf(result: StorageResult<unknown>): SaveProblem | null {
  if (result.ok) return null;
  if (result.reason === "full") return "full";
  return result.reason === "error" ? "error" : "unavailable";
}

type Item = { id: string };

/** Saves each item. Stops at the first failure and returns why. */
export async function saveMany<T extends Item>(
  collection: Collection,
  schema: z.ZodType<T>,
  items: readonly T[],
): Promise<SaveProblem | null> {
  for (const item of items) {
    const problem = problemOf(await writeItem(collection, item.id, schema, item));
    if (problem) return problem;
  }
  return null;
}

export async function removeMany(
  collection: Collection,
  ids: readonly string[],
): Promise<SaveProblem | null> {
  for (const id of ids) {
    const problem = problemOf(await removeItem(collection, id));
    if (problem) return problem;
  }
  return null;
}

/** Saves a whole data set, used by restore, import and undo of delete all. */
export async function saveAll(data: TrackerData): Promise<SaveProblem | null> {
  return (
    (await saveMany("tracker-stages", stageSchema, data.stages)) ??
    (await saveMany("jobs", jobSchema, data.jobs)) ??
    (await saveMany("tracker-activity", activitySchema, data.activities)) ??
    (await saveMany("tracker-interviews", interviewSchema, data.interviews)) ??
    (await saveMany("tracker-contacts", contactSchema, data.contacts))
  );
}

export type Changes = {
  save?: Partial<TrackerData>;
  drop?: Partial<Record<keyof TrackerData, readonly string[]>>;
};

const COLLECTION_OF: Record<keyof TrackerData, Collection> = {
  jobs: "jobs",
  stages: "tracker-stages",
  activities: "tracker-activity",
  interviews: "tracker-interviews",
  contacts: "tracker-contacts",
};

/** Writes and removes the named items. Returns why it failed, or null when all saved. */
export async function commit(changes: Changes): Promise<SaveProblem | null> {
  const { save = {}, drop = {} } = changes;
  const problems = [
    await saveMany("jobs", jobSchema, save.jobs ?? []),
    await saveMany("tracker-stages", stageSchema, save.stages ?? []),
    await saveMany("tracker-activity", activitySchema, save.activities ?? []),
    await saveMany("tracker-interviews", interviewSchema, save.interviews ?? []),
    await saveMany("tracker-contacts", contactSchema, save.contacts ?? []),
  ];
  for (const key of Object.keys(drop) as (keyof TrackerData)[]) {
    problems.push(await removeMany(COLLECTION_OF[key], drop[key] ?? []));
  }
  return problems.find((p) => p !== null) ?? null;
}

/** Removes every item in the named collections, used by delete all. */
export const SAVE_MESSAGES: Record<SaveProblem, string> = {
  unavailable:
    "Your last change could not be saved on this device. It stays on this page until you close it. Try again, or export a backup from Settings.",
  full: "Your device has no room left, so your last change was not saved. Free some space or delete old jobs, then try again. Export a backup from Settings first.",
  error:
    "Your last change was not saved because this browser's storage reported an error. It stays on this page until you close it. Export a backup from Settings, then try again.",
};

export const READ_ERROR_MESSAGE =
  "Your saved jobs could not be read because this browser's storage reported an error. Nothing was deleted. Reload the page or try again.";

export const UNAVAILABLE_MESSAGE =
  "Saved jobs cannot be read in this browser. You can still add jobs, but they stay on this page until you close it. A private window can cause this. Open the tracker in a normal window to keep your jobs.";
