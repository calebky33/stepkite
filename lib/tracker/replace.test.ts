import { beforeEach, describe, expect, it, vi } from "vitest";
import { control, listIds, readRawEntries, resetMemoryDb, seed } from "@/lib/storage/memoryDb";
import { replaceTrackerData } from "./replace";
import { DEFAULT_STAGES } from "./schema";
import { makeJob } from "./fixtures.test-util";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

const empty = { jobs: [], stages: [], activities: [], interviews: [], contacts: [] };
const data = {
  jobs: [makeJob({ id: "new1" }), makeJob({ id: "new2" })],
  stages: [...DEFAULT_STAGES],
  activities: [],
  interviews: [],
  contacts: [{ id: "c-new", name: "Sam" }],
};

const ids = async (c: Parameters<typeof listIds>[0]) => {
  const r = await listIds(c);
  return r.ok ? r.value.sort() : [];
};

describe("replaceTrackerData", () => {
  beforeEach(() => resetMemoryDb());

  it("writes new data, then removes stale keys, and reports counts", async () => {
    seed("jobs", "old1", makeJob({ id: "old1" }));
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({
      ok: true,
      removed: 1,
      written: { jobs: 2, stages: 7, contacts: 1 },
    });
    expect(await ids("jobs")).toEqual(["new1", "new2"]);
  });

  it("keeps rows it cannot read", async () => {
    seed("jobs", "weird", { junk: true });
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({ ok: true, leftUnreadable: 1 });
    expect(await ids("jobs")).toEqual(["new1", "new2", "weird"]);
  });

  it("restores the earlier data when a write fails", async () => {
    seed("jobs", "old1", makeJob({ id: "old1", title: "Original" }));
    control.failWrite = ["new2"];
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({ ok: false, restored: true, written: { jobs: 1 } });
    expect(!r.ok && r.failed).toEqual([{ collection: "jobs", id: "new2", reason: "error" }]);
    expect(await ids("jobs")).toEqual(["old1"]);
    expect(await ids("tracker-stages")).toEqual([]);
  });

  it("restores when removing a stale key fails", async () => {
    seed("jobs", "old1", makeJob({ id: "old1" }));
    control.failRemove = ["old1"];
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({ ok: false, restored: true });
    expect(await ids("jobs")).toEqual(["old1"]);
  });

  it("touches nothing when storage cannot be read", async () => {
    control.unavailable = true;
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({ ok: false, reason: "unavailable", restored: false });
  });

  it("can replace with nothing", async () => {
    seed("jobs", "old1", makeJob({ id: "old1" }));
    expect((await replaceTrackerData(empty)).ok).toBe(true);
    expect(await ids("jobs")).toEqual([]);
  });

  it("puts back the exact stored bytes, not the parsed row", async () => {
    const stored = { ...makeJob({ id: "old1" }), extra: { keep: "me" } };
    seed("jobs", "old1", stored);
    control.failWrite = ["new2"];
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({ ok: false, restored: true });
    const raw = await readRawEntries("jobs");
    expect(raw.ok && raw.value).toEqual([{ id: "old1", raw: stored }]);
  });

  it("refuses before any write when an incoming id matches an unreadable row", async () => {
    seed("jobs", "new1", { junk: true });
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({
      ok: false,
      reason: "id-collision",
      restored: false,
      failed: [{ collection: "jobs", id: "new1" }],
    });
    expect(await ids("jobs")).toEqual(["new1"]);
    expect(await ids("tracker-stages")).toEqual([]);
    const raw = await readRawEntries("jobs");
    expect(raw.ok && raw.value[0]?.raw).toEqual({ junk: true });
  });

  it("reports counts per collection when the rollback itself fails", async () => {
    seed("jobs", "old1", makeJob({ id: "old1" }));
    control.failWrite = ["new2", "old1"];
    control.failRemove = ["new1"];
    const r = await replaceTrackerData(data);
    expect(r).toMatchObject({
      ok: false,
      restored: false,
      leftover: { jobs: { notRemoved: 1, notRestored: 1, unchecked: false } },
    });
  });
});
