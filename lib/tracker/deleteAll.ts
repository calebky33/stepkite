import { z } from "zod";
import { clearCollection, type Collection } from "@/lib/storage/db";
import type { TrackerData } from "./backup";
import { writeTrackerData, type TrackerCounts, type WriteFailure } from "./replace";
import { activitySchema, contactSchema, interviewSchema, jobSchema, stageSchema } from "./schema";

export const UNDO_WINDOW_MS = 10_000;

/** Everything "delete all my tracker data" clears. The snapshot holds all of it. */
export const TRACKER_COLLECTIONS: readonly Collection[] = [
  "jobs",
  "tracker-activity",
  "tracker-interviews",
  "tracker-contacts",
  "tracker-stages",
];

/**
 * Everything the wipe option clears: the tracker data plus the quarantine copies of unreadable
 * rows. Quarantine is not in the snapshot type, so those rows cannot be undone.
 */
export const WIPE_COLLECTIONS: readonly Collection[] = [...TRACKER_COLLECTIONS, "tracker-quarantine"];

const SESSION_KEY = "stepkite-tracker-undo";
/** Snapshots over this many characters are not copied to sessionStorage. */
export const SESSION_SNAPSHOT_MAX_CHARS = 2 * 1024 * 1024;

export type DeleteAllPlan = {
  /** Lets `plan.ok === false` narrow against DeleteAllRefused. */
  ok?: true;
  clear: readonly Collection[];
  snapshot: TrackerData;
  undoUntil: number;
  /**
   * True when the snapshot was also saved in sessionStorage, so a reload can still undo.
   * False means a reload will NOT restore it: tell the user to undo before leaving the page.
   */
  persisted?: boolean;
  /** Unreadable rows deleted by the wipe option. They have no undo. 0 for a normal plan. */
  unreadableDeleted: number;
  /** Set after a failed restore. A held plan does not expire until restored or discarded. */
  held?: boolean;
};

export type DeleteAllRefused = {
  ok: false;
  reason: "unreadable-rows";
  /** How many stored rows could not be read. Deleting would lose them for good. */
  skipped: number;
};

const sessionSchema = z.object({
  undoUntil: z.number(),
  held: z.boolean().optional(),
  wipe: z.number().int().min(0).optional(),
  snapshot: z.object({
    jobs: z.array(jobSchema),
    stages: z.array(stageSchema),
    activities: z.array(activitySchema),
    interviews: z.array(interviewSchema),
    contacts: z.array(contactSchema),
  }),
});

function persist(plan: DeleteAllPlan): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const text = JSON.stringify({
      undoUntil: plan.undoUntil,
      held: plan.held,
      wipe: plan.unreadableDeleted > 0 || plan.clear.length > TRACKER_COLLECTIONS.length ? plan.unreadableDeleted : undefined,
      snapshot: plan.snapshot,
    });
    if (text.length > SESSION_SNAPSHOT_MAX_CHARS) return false;
    sessionStorage.setItem(SESSION_KEY, text);
    return true;
  } catch {
    return false;
  }
}

/** Forgets the saved snapshot. */
export function clearPersistedPlan(): void {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up if storage is blocked.
  }
}

/**
 * What "delete all my tracker data" clears, plus a copy to undo with. The copy is also kept in
 * sessionStorage for the length of the undo window. Pass the `skipped` total from readAll: the
 * plan is refused when any stored row could not be read, because those rows are not in the
 * copy and would be lost. With `{ includeUnreadable: true }` the plan wipes those rows and the
 * quarantine too, with no undo for them (`unreadableDeleted` says how many).
 */
export function planDeleteAll(
  data: TrackerData,
  nowMs: number,
  skipped: number,
  options: { includeUnreadable?: boolean } = {},
): DeleteAllPlan | DeleteAllRefused {
  const wipe = options.includeUnreadable === true;
  if (skipped > 0 && !wipe) return { ok: false, reason: "unreadable-rows", skipped };
  const plan: DeleteAllPlan = {
    clear: wipe ? WIPE_COLLECTIONS : TRACKER_COLLECTIONS,
    snapshot: structuredClone(data),
    undoUntil: nowMs + UNDO_WINDOW_MS,
    unreadableDeleted: wipe ? Math.max(0, skipped) : 0,
  };
  plan.persisted = persist(plan);
  return plan;
}

/**
 * Clears the given collections. Keeps going after a failure and lists the collections that
 * may still hold data, so the UI can keep the plan and offer to restore.
 */
export async function wipeCollections(
  collections: readonly Collection[],
): Promise<{ ok: boolean; remaining: Collection[] }> {
  const remaining: Collection[] = [];
  for (const name of collections) {
    const r = await clearCollection(name);
    if (!r.ok) remaining.push(name);
  }
  return { ok: remaining.length === 0, remaining };
}

/**
 * A plan saved before a reload, while its window is still open. Otherwise null, and the saved
 * copy is cleared. The saved deadline is clamped so a tampered value cannot extend the window.
 */
export function loadPersistedPlan(nowMs: number): DeleteAllPlan | null {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const text = sessionStorage.getItem(SESSION_KEY);
    if (!text) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(text));
    if (!parsed.success || !Number.isFinite(parsed.data.undoUntil)) {
      clearPersistedPlan();
      return null;
    }
    const held = parsed.data.held === true;
    if (!held && nowMs > parsed.data.undoUntil) {
      clearPersistedPlan();
      return null;
    }
    const wiped = parsed.data.wipe !== undefined;
    return {
      clear: wiped ? WIPE_COLLECTIONS : TRACKER_COLLECTIONS,
      snapshot: parsed.data.snapshot,
      undoUntil: Math.min(parsed.data.undoUntil, nowMs + UNDO_WINDOW_MS),
      persisted: true,
      unreadableDeleted: parsed.data.wipe ?? 0,
      ...(held ? { held } : {}),
    };
  } catch {
    clearPersistedPlan();
    return null;
  }
}

/** Gives up the undo for good: forgets the saved copy. Safe to call from a pagehide handler. */
export function discardPlan(): void {
  clearPersistedPlan();
}

/** A copy of the snapshot while the undo window is open, otherwise null. */
export function restoreFromPlan(plan: DeleteAllPlan, nowMs: number): TrackerData | null {
  return plan.held || nowMs <= plan.undoUntil ? structuredClone(plan.snapshot) : null;
}

export type RestoreResult =
  | { ok: true; data: TrackerData; written: TrackerCounts }
  | { ok: false; reason: "expired"; failed: [] }
  /** held: the plan no longer expires. Retry, or call discardPlan to give up. */
  | { ok: false; reason: "write-failed"; failed: WriteFailure[]; held: true };

/**
 * Undoes a delete by writing the snapshot back. The saved copy is kept until every write has
 * succeeded, so a failed attempt can be tried again inside the window.
 */
export async function restoreTracker(plan: DeleteAllPlan, nowMs: number): Promise<RestoreResult> {
  const data = restoreFromPlan(plan, nowMs);
  if (!data) {
    clearPersistedPlan();
    return { ok: false, reason: "expired", failed: [] };
  }
  const { written, failed } = await writeTrackerData(data);
  if (failed.length > 0) {
    plan.held = true;
    persist(plan);
    return { ok: false, reason: "write-failed", failed, held: true };
  }
  clearPersistedPlan();
  return { ok: true, data, written };
}
