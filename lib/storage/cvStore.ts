import { z } from "zod";
import { addSnapshot, snapshotSchema, type SnapshotSet } from "@/lib/cv/snapshots";
import { storedCvSchema, type Cv } from "@/lib/cv/schema";
import {
  clearEverything,
  listIds,
  readAll,
  readItem,
  removeItem,
  writeItem,
  type StorageFailure,
  type StorageResult,
} from "./db";

/**
 * Everything the CV builder keeps on the device. Nothing in this file touches the network.
 * Each call returns a result instead of throwing, so the screen can show a plain message.
 */
export const BIN_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const binSchema = z.object({
  id: z.string().min(1).max(64),
  deletedAt: z.number().int().nonnegative(),
  cv: storedCvSchema,
});
export type BinEntry = z.infer<typeof binSchema>;

export function newCvId(): string {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `cv-${id}`;
}

export function copyName(title: string): string {
  return `Copy of ${title.trim() || "Untitled"}`.slice(0, 120);
}

export async function listCvs(): Promise<StorageResult<{ cvs: Cv[]; skipped: number }>> {
  const result = await readAll("cvs", storedCvSchema);
  if (!result.ok) return result;
  const cvs = [...result.value.items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { ok: true, value: { cvs, skipped: result.value.skipped } };
}

export function saveCv(cv: Cv): Promise<StorageResult<null>> {
  return writeItem("cvs", cv.id, storedCvSchema, cv);
}

export async function duplicateCv(
  id: string,
  now: Date,
  name?: string,
): Promise<StorageResult<Cv>> {
  const source = await readItem("cvs", id, storedCvSchema);
  if (!source.ok) return source;
  const title = (name?.trim() || copyName(source.value.title)).slice(0, 120);
  const copy: Cv = { ...source.value, id: newCvId(), title, updatedAt: now.toISOString() };
  const saved = await saveCv(copy);
  return saved.ok ? { ok: true, value: copy } : saved;
}

export async function renameCv(id: string, title: string, now: Date): Promise<StorageResult<Cv>> {
  const source = await readItem("cvs", id, storedCvSchema);
  if (!source.ok) return source;
  const renamed: Cv = {
    ...source.value,
    title: title.trim().slice(0, 120),
    updatedAt: now.toISOString(),
  };
  const saved = await saveCv(renamed);
  return saved.ok ? { ok: true, value: renamed } : saved;
}

/** Moves a CV to the bin. It is kept for 30 days. The CV is only removed once the bin copy is written. */
export async function binCv(id: string, now: Date): Promise<StorageResult<null>> {
  const source = await readItem("cvs", id, storedCvSchema);
  if (!source.ok) return source;
  const entry: BinEntry = { id, deletedAt: now.getTime(), cv: source.value };
  const written = await writeItem("cv-bin", id, binSchema, entry);
  if (!written.ok) return written;
  return removeItem("cvs", id);
}

/** Lists the bin, newest first, and erases anything older than 30 days. */
export async function listBin(now: Date): Promise<StorageResult<BinEntry[]>> {
  const result = await readAll("cv-bin", binSchema);
  if (!result.ok) return result;
  const cutoff = now.getTime() - BIN_DAYS * DAY_MS;
  const keep: BinEntry[] = [];
  const expired: BinEntry[] = [];
  for (const entry of result.value.items) {
    if (entry.deletedAt < cutoff) expired.push(entry);
    else keep.push(entry);
  }
  const purged = await Promise.all(
    expired.flatMap((e) => [removeItem("cv-bin", e.id), removeItem("cv-snapshots", e.id)]),
  );
  // An entry whose removal failed stays in the bin, so it is tried again next time.
  expired.forEach((entry, i) => {
    if (!purged[i * 2]?.ok) keep.push(entry);
  });
  keep.sort((a, b) => b.deletedAt - a.deletedAt);
  return { ok: true, value: keep };
}

export function daysLeftInBin(entry: BinEntry, now: Date): number {
  const left = Math.ceil((entry.deletedAt + BIN_DAYS * DAY_MS - now.getTime()) / DAY_MS);
  return Math.max(0, Math.min(BIN_DAYS, left));
}

export async function restoreCv(id: string): Promise<StorageResult<Cv>> {
  const entry = await readItem("cv-bin", id, binSchema);
  if (!entry.ok) return entry;
  const saved = await saveCv(entry.value.cv);
  if (!saved.ok) return saved;
  // The CV is saved. If the bin copy stays, report it so the caller can retry: a retry is safe.
  const removed = await removeItem("cv-bin", id);
  if (!removed.ok) return removed;
  return { ok: true, value: entry.value.cv };
}

export async function emptyBinEntry(id: string): Promise<StorageResult<null>> {
  const removed = await removeItem("cv-bin", id);
  await removeItem("cv-snapshots", id);
  return removed;
}

export async function listSnapshots(id: string): Promise<StorageResult<SnapshotSet>> {
  const result = await readItem("cv-snapshots", id, snapshotSchema);
  if (result.ok) return result;
  if (result.reason === "missing") return { ok: true, value: { id, copies: [] } };
  return result;
}

/** Keeps a copy of the CV at most once every five minutes, ten copies in all. */
export async function maybeSnapshot(cv: Cv, now: Date): Promise<StorageResult<boolean>> {
  const current = await listSnapshots(cv.id);
  if (!current.ok) return current;
  const next = addSnapshot(current.value, { at: now.getTime(), cv });
  if (next === current.value) return { ok: true, value: false };
  const written = await writeItem("cv-snapshots", cv.id, snapshotSchema, next);
  return written.ok ? { ok: true, value: true } : written;
}

export type ReplaceFailure = Omit<StorageFailure, "ok" | "cause" | "remaining"> & {
  failed: string[];
};

/** Replaces every CV on the device with the given list. Used after the user confirms an import. */
export async function replaceAllCvs(
  cvs: readonly Cv[],
): Promise<StorageResult<null> | ({ ok: false } & ReplaceFailure)> {
  const ids = await listIds("cvs");
  if (!ids.ok) return ids;
  const keep = new Set(cvs.map((cv) => cv.id));
  // Old CVs go to the bin first, so a failure part way never loses one.
  const failed: string[] = [];
  let reason: ReplaceFailure["reason"] = "unavailable";
  const now = new Date();
  for (const id of ids.value) {
    if (keep.has(id)) continue;
    const binned = await binCv(id, now);
    if (!binned.ok) {
      failed.push(id);
      reason = binned.reason;
    }
  }
  if (failed.length > 0) return { ok: false, reason, failed };
  for (const cv of cvs) {
    const saved = await saveCv(cv);
    if (!saved.ok) {
      failed.push(cv.id);
      reason = saved.reason;
    }
  }
  return failed.length > 0 ? { ok: false, reason, failed } : { ok: true, value: null };
}

/** Erases every CV, copy, bin entry and saved setting on this device. */
export async function deleteAllData(): Promise<StorageResult<null>> {
  const cleared = await clearEverything();
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("stepkite") || key === "sk_theme" || key === "sk_country") {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Blocked storage has nothing of ours in it.
  }
  return cleared;
}
