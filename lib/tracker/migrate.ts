import { legacyStageId, SAVED_STAGE_ID } from "./legacy";
import { jobSchema, type Job } from "./schema";

export type MigrateResult = { ok: true; job: Job } | { ok: false; raw: unknown };

/**
 * Turns a stored row, old or new shape, into a Job. When it cannot be read the original is
 * handed back untouched so the loader can quarantine it. Nothing is deleted here.
 */
export function migrateJobResult(raw: unknown): MigrateResult {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return { ok: false, raw };
  const row: Record<string, unknown> = { ...raw };
  const legacyValue = row.stage;
  const hasStageId = typeof row.stageId === "string";
  let legacyId: string | undefined;
  if (!hasStageId && legacyValue !== undefined) {
    legacyId = legacyStageId(legacyValue);
    // An unknown old value is not guessed at. The row is handed back instead.
    if (legacyId === undefined) return { ok: false, raw };
    row.stageId = legacyId;
  }
  delete row.stage;
  const parsed = jobSchema.safeParse(row);
  if (!parsed.success) return { ok: false, raw };
  const job = parsed.data;
  if (legacyId !== undefined && legacyId !== SAVED_STAGE_ID && !job.appliedAt) {
    // Old rows past Saved were applied for, but never recorded when.
    return { ok: true, job: { ...job, appliedAt: job.savedAt } };
  }
  return { ok: true, job };
}

/** Same as migrateJobResult, with the old null for rows that cannot be read. */
export function migrateJob(raw: unknown): Job | null {
  const r = migrateJobResult(raw);
  return r.ok ? r.job : null;
}
