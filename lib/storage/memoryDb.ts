import type { ZodType } from "zod";
import type { Collection, StorageResult } from "./db";

/**
 * An in memory stand in for lib/storage/db.ts. Tests only. Use it with
 * vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb")).
 */
const data = new Map<string, Map<string, unknown>>();
export const control = { unavailable: false };

function bucket(name: string): Map<string, unknown> {
  let found = data.get(name);
  if (!found) {
    found = new Map();
    data.set(name, found);
  }
  return found;
}

export function resetMemoryDb(): void {
  data.clear();
  control.unavailable = false;
}

/** Puts raw, unvalidated data in a collection, for corrupted data tests. */
export function seed(collection: Collection, id: string, value: unknown): void {
  bucket(collection).set(id, structuredClone(value));
}

export const COLLECTIONS: readonly Collection[] = [
  "cvs",
  "jobs",
  "cv-snapshots",
  "cv-bin",
  "cv-feedback",
];

export async function readItem<T>(
  collection: Collection,
  id: string,
  schema: ZodType<T>,
): Promise<StorageResult<T>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  const raw = bucket(collection).get(id);
  if (raw === undefined) return { ok: false, reason: "missing" };
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: "invalid" };
}

export async function writeItem<T>(
  collection: Collection,
  id: string,
  schema: ZodType<T>,
  value: T,
): Promise<StorageResult<null>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  bucket(collection).set(id, structuredClone(parsed.data));
  return { ok: true, value: null };
}

export async function removeItem(collection: Collection, id: string): Promise<StorageResult<null>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  bucket(collection).delete(id);
  return { ok: true, value: null };
}

export async function listIds(collection: Collection): Promise<StorageResult<string[]>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  return { ok: true, value: [...bucket(collection).keys()] };
}

export async function readAll<T>(
  collection: Collection,
  schema: ZodType<T>,
): Promise<StorageResult<{ items: T[]; skipped: number }>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  const items: T[] = [];
  let skipped = 0;
  for (const raw of bucket(collection).values()) {
    const parsed = schema.safeParse(raw);
    if (parsed.success) items.push(parsed.data);
    else skipped += 1;
  }
  return { ok: true, value: { items, skipped } };
}

export async function clearEverything(): Promise<StorageResult<null>> {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  data.clear();
  return { ok: true, value: null };
}
