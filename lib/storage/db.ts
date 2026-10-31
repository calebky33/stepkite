import { clear, createStore, del, entries, get, keys, set, type UseStore } from "idb-keyval";
import type { ZodType } from "zod";
import {
  COLLECTIONS,
  failureFrom,
  type Collection,
  type ReadAllValue,
  type StorageFailure,
  type StorageResult,
} from "./collections";

export { COLLECTIONS, failureFrom };
export type { Collection, ReadAllValue, StorageFailure, StorageResult };

/**
 * Device storage. CV and tracker data live here and never leave the device
 * unless the user signs in and turns on sync (CLAUDE.md rule 3).
 */

const stores = new Map<string, UseStore>();

type StoreLookup = { store: UseStore } | { fail: StorageFailure };

function storeFor(name: string): StoreLookup {
  if (typeof indexedDB === "undefined") return { fail: { ok: false, reason: "unavailable" } };
  const existing = stores.get(name);
  if (existing) return { store: existing };
  try {
    const created = createStore(`stepkite-${name}`, "items");
    stores.set(name, created);
    return { store: created };
  } catch (error) {
    return { fail: failureFrom(error) };
  }
}

export async function readItem<T>(
  collection: Collection,
  id: string,
  schema: ZodType<T>,
): Promise<StorageResult<T>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    const raw: unknown = await get(id, found.store);
    if (raw === undefined) return { ok: false, reason: "missing" };
    const parsed = schema.safeParse(raw);
    return parsed.success ? { ok: true, value: parsed.data } : { ok: false, reason: "invalid" };
  } catch (error) {
    // A failed open is cached by idb-keyval, so drop the store and try a fresh open next time.
    stores.delete(collection);
    return failureFrom(error);
  }
}

export async function writeItem<T>(
  collection: Collection,
  id: string,
  schema: ZodType<T>,
  value: T,
): Promise<StorageResult<null>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  const parsed = schema.safeParse(value);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  try {
    await set(id, parsed.data, found.store);
    return { ok: true, value: null };
  } catch (error) {
    // A failed open is cached by idb-keyval, so drop the store and try a fresh open next time.
    stores.delete(collection);
    return failureFrom(error);
  }
}

export async function removeItem(collection: Collection, id: string): Promise<StorageResult<null>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    await del(id, found.store);
    return { ok: true, value: null };
  } catch (error) {
    // A failed open is cached by idb-keyval, so drop the store and try a fresh open next time.
    stores.delete(collection);
    return failureFrom(error);
  }
}

export async function listIds(collection: Collection): Promise<StorageResult<string[]>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    const all = await keys(found.store);
    return { ok: true, value: all.map(String) };
  } catch (error) {
    // A failed open is cached by idb-keyval, so drop the store and try a fresh open next time.
    stores.delete(collection);
    return failureFrom(error);
  }
}

/**
 * Every item in a collection that passes the schema. `skipped` counts items that did not,
 * and `skippedValues` holds them untouched so a backup can keep them.
 */
export async function readAll<T>(
  collection: Collection,
  schema: ZodType<T>,
): Promise<StorageResult<ReadAllValue<T>>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    const all = await entries(found.store);
    const items: T[] = [];
    const skippedValues: unknown[] = [];
    for (const [, raw] of all) {
      const parsed = schema.safeParse(raw);
      if (parsed.success) items.push(parsed.data);
      else skippedValues.push(raw);
    }
    return { ok: true, value: { items, skipped: skippedValues.length, skippedValues } };
  } catch (error) {
    // A failed open is cached by idb-keyval, so drop the store and try a fresh open next time.
    stores.delete(collection);
    return failureFrom(error);
  }
}

/** Erases one collection. */
export async function clearCollection(collection: Collection): Promise<StorageResult<null>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    await clear(found.store);
    return { ok: true, value: null };
  } catch (error) {
    stores.delete(collection);
    return failureFrom(error);
  }
}

/**
 * Erases every collection on this device. Used by "Delete my data". It keeps going after a
 * failure and lists the collections that still hold data in `remaining`.
 */
export async function clearEverything(): Promise<StorageResult<null>> {
  const remaining: Collection[] = [];
  let first: StorageFailure | null = null;
  for (const name of COLLECTIONS) {
    const found = storeFor(name);
    if ("fail" in found) {
      remaining.push(name);
      first ??= found.fail;
      continue;
    }
    try {
      await clear(found.store);
    } catch (error) {
      stores.delete(name);
      remaining.push(name);
      first ??= failureFrom(error);
    }
  }
  if (remaining.length === 0 || !first) return { ok: true, value: null };
  return { ...first, remaining };
}

/** Every stored row with its key and exact stored value, unvalidated. */
export async function readRawEntries(
  collection: Collection,
): Promise<StorageResult<{ id: string; raw: unknown }[]>> {
  const found = storeFor(collection);
  if ("fail" in found) return found.fail;
  try {
    const all = await entries(found.store);
    return { ok: true, value: all.map(([key, raw]) => ({ id: String(key), raw })) };
  } catch (error) {
    stores.delete(collection);
    return failureFrom(error);
  }
}
