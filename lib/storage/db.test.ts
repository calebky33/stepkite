import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const kv = new Map<string, Map<string, unknown>>();
const fail = { create: null as Error | null, clear: new Set<string>(), set: null as Error | null, get: null as Error | null, created: 0 };

vi.mock("idb-keyval", () => ({
  createStore: (name: string) => {
    fail.created += 1;
    if (fail.create) throw fail.create;
    if (!kv.has(name)) kv.set(name, new Map());
    return name;
  },
  get: async (id: string, store: string) => {
    if (fail.get) throw fail.get;
    return kv.get(store)?.get(id);
  },
  set: async (id: string, value: unknown, store: string) => {
    if (fail.set) throw fail.set;
    kv.get(store)?.set(id, value);
  },
  del: async (id: string, store: string) => {
    kv.get(store)?.delete(id);
  },
  keys: async (store: string) => [...(kv.get(store)?.keys() ?? [])],
  entries: async (store: string) => [...(kv.get(store)?.entries() ?? [])],
  clear: async (store: string) => {
    if (fail.clear.has(store)) throw new DOMException("secret text", "InvalidStateError");
    kv.get(store)?.clear();
  },
}));

const schema = z.object({ n: z.number() });

async function load() {
  vi.resetModules();
  return import("./db");
}

beforeEach(() => {
  kv.clear();
  fail.create = null;
  fail.clear.clear();
  fail.set = null;
  fail.get = null;
  fail.created = 0;
  vi.stubGlobal("indexedDB", {});
});
afterEach(() => vi.unstubAllGlobals());

describe("db", () => {
  it("says unavailable when there is no indexedDB", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const db = await load();
    expect(await db.readItem("jobs", "a", schema)).toEqual({ ok: false, reason: "unavailable" });
  });

  it("says error, with the error name only, when creating a store throws", async () => {
    fail.create = new DOMException("path /home/me/private", "SecurityError");
    const db = await load();
    const r = await db.readItem("jobs", "a", schema);
    expect(r).toEqual({ ok: false, reason: "error", cause: "SecurityError" });
    expect(JSON.stringify(r)).not.toContain("private");
  });

  it("maps QuotaExceededError to full and other write errors to error", async () => {
    const db = await load();
    fail.set = new DOMException("x", "QuotaExceededError");
    expect(await db.writeItem("jobs", "a", schema, { n: 1 })).toEqual({
      ok: false,
      reason: "full",
    });
    fail.set = new DOMException("x", "DataError");
    expect(await db.writeItem("jobs", "a", schema, { n: 1 })).toEqual({
      ok: false,
      reason: "error",
      cause: "DataError",
    });
  });

  it("readAll returns the skipped count and the raw skipped values", async () => {
    const db = await load();
    await db.writeItem("jobs", "a", schema, { n: 1 });
    kv.get("stepkite-jobs")?.set("bad", { n: "x" });
    const r = await db.readAll("jobs", schema);
    expect(r).toEqual({
      ok: true,
      value: { items: [{ n: 1 }], skipped: 1, skippedValues: [{ n: "x" }] },
    });
  });

  it("clearEverything keeps going and lists what remains", async () => {
    const db = await load();
    await db.writeItem("jobs", "a", schema, { n: 1 });
    await db.writeItem("cvs", "b", schema, { n: 2 });
    fail.clear.add("stepkite-jobs");
    const r = await db.clearEverything();
    expect(r).toMatchObject({ ok: false, reason: "error", cause: "InvalidStateError" });
    expect(r.ok === false && r.remaining).toEqual(["jobs"]);
    expect(JSON.stringify(r)).not.toContain("secret");
    expect(kv.get("stepkite-cvs")?.size).toBe(0);
  });

  it("clearEverything succeeds when everything clears", async () => {
    const db = await load();
    await db.writeItem("jobs", "a", schema, { n: 1 });
    expect(await db.clearEverything()).toEqual({ ok: true, value: null });
  });

  it("opens the store again after a failed read, so a one-off failure does not stick", async () => {
    const db = await load();
    fail.get = new DOMException("x", "InvalidStateError");
    expect((await db.readItem("jobs", "a", schema)).ok).toBe(false);
    fail.get = null;
    await db.writeItem("jobs", "a", schema, { n: 1 });
    expect(await db.readItem("jobs", "a", schema)).toEqual({ ok: true, value: { n: 1 } });
    expect(fail.created).toBe(2);
  });

  it("clearCollection clears one collection and reports a failure", async () => {
    const db = await load();
    await db.writeItem("jobs", "a", schema, { n: 1 });
    await db.writeItem("cvs", "b", schema, { n: 2 });
    expect(await db.clearCollection("jobs")).toEqual({ ok: true, value: null });
    expect(kv.get("stepkite-cvs")?.size).toBe(1);
    fail.clear.add("stepkite-cvs");
    expect(await db.clearCollection("cvs")).toMatchObject({ ok: false, reason: "error" });
  });
});
