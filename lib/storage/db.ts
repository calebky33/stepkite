import { createStore, del, get, keys, set, type UseStore } from "idb-keyval";
import type { ZodType } from "zod";

/**
 * Device storage. CV and tracker data live here and never leave the device
 * unless the user signs in and turns on sync (CLAUDE.md rule 3).
 */
export type StorageResult<T> =
  { ok: true; value: T } | { ok: false; reason: "unavailable" | "invalid" | "missing" };

const stores = new Map<string, UseStore>();

function storeFor(name: string): UseStore | null {
  if (typeof indexedDB === "undefined") return null;
  const existing = stores.get(name);
  if (existing) return existing;
  const created = createStore(`stepkite-${name}`, "items");
  stores.set(name, created);
  return created;
}

export async function readItem<T>(
  collection: "cvs" | "jobs",
  id: string,
  schema: ZodType<T>,
): Promise<StorageResult<T>> {
  const store = storeFor(collection);
  if (!store) return { ok: false, reason: "unavailable" };
  try {
    const raw: unknown = await get(id, store);
    if (raw === undefined) return { ok: false, reason: "missing" };
    const parsed = schema.safeParse(raw);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function writeItem<T>(
  collection: "cvs" | "jobs",
  id: string,
  schema: ZodType<T>,
  value: T,
): Promise<StorageResult<null>> {
  const store = storeFor(collection);
  if (!store) return { ok: false, reason: "unavailable" };
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    await set(id, parsed.data, store);
    return { ok: true, value: null };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function removeItem(
  collection: "cvs" | "jobs",
  id: string,
): Promise<StorageResult<null>> {
  const store = storeFor(collection);
  if (!store) return { ok: false, reason: "unavailable" };
  try {
    await del(id, store);
    return { ok: true, value: null };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function listIds(collection: "cvs" | "jobs"): Promise<StorageResult<string[]>> {
  const store = storeFor(collection);
  if (!store) return { ok: false, reason: "unavailable" };
  try {
    const all = await keys(store);
    return { ok: true, value: all.map(String) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
