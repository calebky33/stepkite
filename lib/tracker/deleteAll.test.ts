import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { control, resetMemoryDb, seed } from "@/lib/storage/memoryDb";
import {
  SESSION_SNAPSHOT_MAX_CHARS,
  UNDO_WINDOW_MS,
  WIPE_COLLECTIONS,
  discardPlan,
  wipeCollections,
  type DeleteAllPlan,
  loadPersistedPlan,
  planDeleteAll,
  restoreFromPlan,
  restoreTracker,
} from "./deleteAll";
import { listIds } from "@/lib/storage/memoryDb";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));
import { DEFAULT_STAGES } from "./schema";
import { makeJob } from "./fixtures.test-util";

const mk = (data: typeof snap, now: number, skipped = 0, opts?: { includeUnreadable?: boolean }): DeleteAllPlan => {
  const p = planDeleteAll(data, now, skipped, opts);
  if (p.ok === false) throw new Error("refused");
  return p;
};

const snap = {
  jobs: [makeJob()],
  stages: [...DEFAULT_STAGES],
  activities: [],
  interviews: [],
  contacts: [{ id: "c", name: "A" }],
};

describe("planDeleteAll", () => {
  it("names the tracker collections to clear and keeps a snapshot", () => {
    const plan = mk(snap, 1000);
    expect(plan.clear).toEqual([
      "jobs",
      "tracker-activity",
      "tracker-interviews",
      "tracker-contacts",
      "tracker-stages",
    ]);
    expect(plan.snapshot).toEqual(snap);
    expect(plan.undoUntil).toBe(1000 + UNDO_WINDOW_MS);
    expect(UNDO_WINDOW_MS).toBe(10_000);
  });
  it("does not clear CV collections", () => {
    expect(mk(snap, 0).clear).not.toContain("cvs");
  });
  it("snapshot is a copy", () => {
    const plan = mk(snap, 0);
    expect(plan.snapshot).not.toBe(snap);
    expect(plan.snapshot.jobs).not.toBe(snap.jobs);
  });
});

describe("restoreFromPlan", () => {
  it("restores within the window, including the last millisecond", () => {
    const plan = mk(snap, 0);
    expect(restoreFromPlan(plan, 9999)).toEqual(snap);
    expect(restoreFromPlan(plan, 10_000)).toEqual(snap);
  });
  it("returns null after the window", () => {
    expect(restoreFromPlan(mk(snap, 0), 10_001)).toBeNull();
  });
});

describe("safe delete", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    resetMemoryDb();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("refuses when stored rows were unreadable", () => {
    expect(planDeleteAll(snap, 0, 2)).toEqual({ ok: false, reason: "unreadable-rows", skipped: 2 });
    expect(planDeleteAll(snap, 0, 0)).toMatchObject({ undoUntil: UNDO_WINDOW_MS });
  });

  it("restores a clone, not the stored snapshot", () => {
    const plan = mk(snap, 0);
    const out = restoreFromPlan(plan, 5);
    expect(out).toEqual(snap);
    expect(out).not.toBe(plan.snapshot);
    expect(out?.jobs).not.toBe(plan.snapshot.jobs);
  });

  it("survives a reload inside the window and not after", () => {
    mk(snap, 1000);
    expect(loadPersistedPlan(5000)?.snapshot).toEqual(snap);
    expect(loadPersistedPlan(1000 + UNDO_WINDOW_MS + 1)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("does not persist an oversize snapshot and survives blocked storage", () => {
    const big = { ...snap, contacts: [{ id: "c", name: "x".repeat(SESSION_SNAPSHOT_MAX_CHARS) }] };
    expect(mk(big, 0).persisted).toBe(false);
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(mk(snap, 0).persisted).toBe(false);
    expect(loadPersistedPlan(0)).toBeNull();
  });

  it("ignores a damaged saved copy", () => {
    store.set("stepkite-tracker-undo", "{nope");
    expect(loadPersistedPlan(0)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("writes everything back and clears the saved copy", async () => {
    const plan = mk(snap, 0);
    const r = await restoreTracker(plan, 100);
    expect(r.ok && r.written.jobs).toBe(1);
    const ids = await listIds("tracker-stages");
    expect(ids.ok && ids.value).toHaveLength(DEFAULT_STAGES.length);
    expect(store.size).toBe(0);
  });

  it("reports expired", async () => {
    const plan = mk(snap, 0);
    expect(await restoreTracker(plan, UNDO_WINDOW_MS + 1)).toEqual({
      ok: false,
      reason: "expired",
      failed: [],
    });
  });

  it("keeps the snapshot when a write fails", async () => {
    const plan = mk(snap, 0);
    control.failWrite = ["j1"];
    const r = await restoreTracker(plan, 100);
    expect(r).toMatchObject({ ok: false, reason: "write-failed" });
    expect(!r.ok && r.failed[0]?.id).toBe("j1");
    expect(store.size).toBe(1);
    control.failWrite = [];
    expect((await restoreTracker(plan, 200)).ok).toBe(true);
  });
});

describe("wipe, clamp and held plans", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    resetMemoryDb();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("wipes unreadable rows and quarantine only when asked", () => {
    expect(planDeleteAll(snap, 0, 3)).toMatchObject({ ok: false, reason: "unreadable-rows" });
    const p = mk(snap, 0, 3, { includeUnreadable: true });
    expect(p.clear).toEqual(WIPE_COLLECTIONS);
    expect(p.clear).toContain("tracker-quarantine");
    expect(p.unreadableDeleted).toBe(3);
    expect(loadPersistedPlan(1)?.clear).toEqual(WIPE_COLLECTIONS);
    expect(mk(snap, 0).unreadableDeleted).toBe(0);
  });

  it("wipeCollections goes on after a failure and lists what remains", async () => {
    seed("jobs", "a", { x: 1 });
    seed("tracker-contacts", "b", { x: 1 });
    seed("tracker-quarantine", "q", { x: 1 });
    control.failClear = ["tracker-contacts"];
    const r = await wipeCollections(WIPE_COLLECTIONS);
    expect(r).toEqual({ ok: false, remaining: ["tracker-contacts"] });
    const jobs = await listIds("jobs");
    const quarantine = await listIds("tracker-quarantine");
    expect(jobs.ok && jobs.value).toEqual([]);
    expect(quarantine.ok && quarantine.value).toEqual([]);
    control.failClear = [];
    expect(await wipeCollections(WIPE_COLLECTIONS)).toEqual({ ok: true, remaining: [] });
  });

  it("clamps a tampered deadline and rejects malformed or expired copies", () => {
    store.set("stepkite-tracker-undo", JSON.stringify({ undoUntil: 9e15, snapshot: snap }));
    expect(loadPersistedPlan(1000)?.undoUntil).toBe(1000 + UNDO_WINDOW_MS);
    store.set("stepkite-tracker-undo", JSON.stringify({ undoUntil: "x", snapshot: snap }));
    expect(loadPersistedPlan(0)).toBeNull();
    expect(store.size).toBe(0);
    mk(snap, 0);
    expect(loadPersistedPlan(UNDO_WINDOW_MS + 1)).toBeNull();
    expect(store.size).toBe(0);
  });

  it("discardPlan never throws and clears the copy", () => {
    mk(snap, 0);
    discardPlan();
    expect(store.size).toBe(0);
    vi.stubGlobal("sessionStorage", {
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => discardPlan()).not.toThrow();
  });

  it("holds the plan past the window after a failed restore", async () => {
    const plan = mk(snap, 0);
    control.failWrite = ["j1"];
    const r = await restoreTracker(plan, 100);
    expect(r).toMatchObject({ ok: false, held: true });
    control.failWrite = [];
    expect(plan.held).toBe(true);
    const reloaded = loadPersistedPlan(UNDO_WINDOW_MS * 10);
    expect(reloaded?.held).toBe(true);
    const again = await restoreTracker(plan, UNDO_WINDOW_MS * 10);
    expect(again.ok).toBe(true);
    expect(store.size).toBe(0);
  });
});

void seed;
