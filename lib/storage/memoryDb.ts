import type { ZodType } from "zod";
import type { Collection, ReadAllValue, StorageFailure, StorageResult } from "./collections";

export { COLLECTIONS } from "./collections";

/**
 * An in memory stand in for lib/storage/db.ts. Tests only. Use it with
 * vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb")).
 */
const data = new Map<string, Map<string, unknown>>();
export const control: {
  unavailable: boolean;
  /** Simulates a storage call that throws. */
  error: boolean;
  /** Simulates a full disk on writes. */
  full: boolean;
  /** Collections whose clear fails. */
  failClear: Collection[];
  /** Item ids whose write fails. */
  failWrite: string[];
  /** Item ids whose removal fails. */
  failRemove: string[];
} = { unavailable: false, error: false, full: false, failClear: [], failWrite: [], failRemove: [] };

function blocked(): StorageFailure | null {
  if (control.unavailable) return { ok: false, reason: "unavailable" };
  if (control.error) return { ok: false, reason: "error", cause: "UnknownError" };
  return null;
}

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
  control.error = false;
  control.full = false;
  control.failClear = [];
  control.failWrite = [];
  control.failRemove = [];
}

/** Puts raw, unvalidated data in a collection, for corrupted data tests. */
export function seed(collection: Collection, id: string, value: unknown): void {
  bucket(collection).set(id, structuredClone(value));
}

export async function readItem<T>(
  collection: Collection,
  id: string,
  schema: ZodType<T>,
): Promise<StorageResult<T>> {
  const stop = blocked();
  if (stop) return stop;
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
  const stop = blocked();
  if (stop) return stop;
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (control.full) return { ok: false, reason: "full" };
  if (control.failWrite.includes(id)) return { ok: false, reason: "error", cause: "UnknownError" };
  bucket(collection).set(id, structuredClone(parsed.data));
  return { ok: true, value: null };
}

export async function removeItem(collection: Collection, id: string): Promise<StorageResult<null>> {
  const stop = blocked();
  if (stop) return stop;
  if (control.failRemove.includes(id)) return { ok: false, reason: "error", cause: "UnknownError" };
  bucket(collection).delete(id);
  return { ok: true, value: null };
}

export async function listIds(collection: Collection): Promise<StorageResult<string[]>> {
  const stop = blocked();
  if (stop) return stop;
  return { ok: true, value: [...bucket(collection).keys()] };
}

export async function readAll<T>(
  collection: Collection,
  schema: ZodType<T>,
): Promise<StorageResult<ReadAllValue<T>>> {
  const stop = blocked();
  if (stop) return stop;
  const items: T[] = [];
  const skippedValues: unknown[] = [];
  for (const raw of bucket(collection).values()) {
    const parsed = schema.safeParse(raw);
    if (parsed.success) items.push(parsed.data);
    else skippedValues.push(structuredClone(raw));
  }
  return { ok: true, value: { items, skipped: skippedValues.length, skippedValues } };
}

export async function clearEverything(): Promise<StorageResult<null>> {
  const stop = blocked();
  if (stop) return stop;
  const remaining: Collection[] = [];
  for (const [name, items] of [...data.entries()]) {
    if (control.failClear.includes(name as Collection)) {
      if (items.size > 0) remaining.push(name as Collection);
    } else items.clear();
  }
  if (remaining.length === 0) return { ok: true, value: null };
  return { ok: false, reason: "error", cause: "UnknownError", remaining };
}

export async function clearCollection(collection: Collection): Promise<StorageResult<null>> {
  const stop = blocked();
  if (stop) return stop;
  if (control.failClear.includes(collection)) {
    return { ok: false, reason: "error", cause: "UnknownError" };
  }
  bucket(collection).clear();
  return { ok: true, value: null };
}

export async function readRawEntries(
  collection: Collection,
): Promise<StorageResult<{ id: string; raw: unknown }[]>> {
  const stop = blocked();
  if (stop) return stop;
  return {
    ok: true,
    value: [...bucket(collection).entries()].map(([id, raw]) => ({ id, raw: structuredClone(raw) })),
  };
}
