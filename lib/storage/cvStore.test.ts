import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => import("./memoryDb"));

import { emptyCv, type Cv } from "@/lib/cv/schema";
import { SNAPSHOT_EVERY_MS } from "@/lib/cv/snapshots";
import {
  binCv,
  BIN_DAYS,
  daysLeftInBin,
  deleteAllData,
  duplicateCv,
  listBin,
  listCvs,
  listSnapshots,
  maybeSnapshot,
  renameCv,
  replaceAllCvs,
  restoreCv,
  saveCv,
} from "./cvStore";
import { control, resetMemoryDb, seed } from "./memoryDb";

const T0 = new Date("2026-03-01T10:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const make = (id: string, title: string): Cv => ({
  ...emptyCv(id, "uk", T0.toISOString()),
  title,
});

beforeEach(() => resetMemoryDb());

describe("cv store", () => {
  it("duplicates as Copy of and as a named version", async () => {
    await saveCv(make("a", "Graduate UK"));
    const copy = await duplicateCv("a", T0);
    expect(copy.ok && copy.value.title).toBe("Copy of Graduate UK");
    expect(copy.ok && copy.value.id).not.toBe("a");
    const named = await duplicateCv("a", T0, "Data role");
    expect(named.ok && named.value.title).toBe("Data role");
    const all = await listCvs();
    expect(all.ok && all.value.cvs).toHaveLength(3);
  });

  it("names an untitled copy", async () => {
    await saveCv(make("a", ""));
    const copy = await duplicateCv("a", T0);
    expect(copy.ok && copy.value.title).toBe("Copy of Untitled");
  });

  it("renames", async () => {
    await saveCv(make("a", "Old"));
    const renamed = await renameCv("a", "  New name ", T0);
    expect(renamed.ok && renamed.value.title).toBe("New name");
  });

  it("reports it when the bin copy cannot be removed after a restore", async () => {
    await saveCv(make("a", "Keep me"));
    await binCv("a", T0);
    control.failRemove = ["a"];
    expect((await restoreCv("a")).ok).toBe(false);
    control.failRemove = [];
    expect((await restoreCv("a")).ok).toBe(true);
  });

  it("moves a deleted CV to the bin and restores it", async () => {
    await saveCv(make("a", "Keep me"));
    expect((await binCv("a", T0)).ok).toBe(true);
    const gone = await listCvs();
    expect(gone.ok && gone.value.cvs).toHaveLength(0);
    const bin = await listBin(T0);
    expect(bin.ok && bin.value).toHaveLength(1);
    expect((await restoreCv("a")).ok).toBe(true);
    const back = await listCvs();
    expect(back.ok && back.value.cvs[0]?.title).toBe("Keep me");
    const after = await listBin(T0);
    expect(after.ok && after.value).toHaveLength(0);
  });

  it("erases bin entries after 30 days and not before", async () => {
    await saveCv(make("a", "Old"));
    await binCv("a", T0);
    const day29 = new Date(T0.getTime() + (BIN_DAYS - 1) * DAY);
    const kept = await listBin(day29);
    expect(kept.ok && kept.value).toHaveLength(1);
    expect(kept.ok && daysLeftInBin(kept.value[0]!, day29)).toBe(1);
    const day31 = new Date(T0.getTime() + (BIN_DAYS + 1) * DAY);
    const purged = await listBin(day31);
    expect(purged.ok && purged.value).toHaveLength(0);
    expect((await restoreCv("a")).ok).toBe(false);
  });

  it("takes a snapshot at most every five minutes and keeps ten", async () => {
    const cv = make("a", "x");
    expect((await maybeSnapshot(cv, T0)).ok).toBe(true);
    const tooSoon = await maybeSnapshot(cv, new Date(T0.getTime() + SNAPSHOT_EVERY_MS - 1));
    expect(tooSoon.ok && tooSoon.value).toBe(false);
    for (let i = 1; i <= 14; i += 1) {
      await maybeSnapshot(cv, new Date(T0.getTime() + i * SNAPSHOT_EVERY_MS));
    }
    const set = await listSnapshots("a");
    expect(set.ok && set.value.copies).toHaveLength(10);
  });

  it("replaces all CVs and keeps the old ones in the bin", async () => {
    await saveCv(make("old", "Old"));
    expect((await replaceAllCvs([make("new", "New")])).ok).toBe(true);
    const list = await listCvs();
    expect(list.ok && list.value.cvs.map((c) => c.id)).toEqual(["new"]);
    const bin = await listBin(new Date());
    expect(bin.ok && bin.value.map((e) => e.id)).toEqual(["old"]);
  });

  it("deletes all data", async () => {
    await saveCv(make("a", "x"));
    await binCv("a", T0);
    await saveCv(make("b", "y"));
    await maybeSnapshot(make("b", "y"), T0);
    expect((await deleteAllData()).ok).toBe(true);
    const list = await listCvs();
    const bin = await listBin(T0);
    const snaps = await listSnapshots("b");
    expect(list.ok && list.value.cvs).toHaveLength(0);
    expect(bin.ok && bin.value).toHaveLength(0);
    expect(snaps.ok && snaps.value.copies).toHaveLength(0);
  });

  it("reports corrupted items without deleting them", async () => {
    await saveCv(make("a", "fine"));
    seed("cvs", "bad", { id: "bad", nonsense: true });
    const list = await listCvs();
    expect(list.ok && list.value.cvs).toHaveLength(1);
    expect(list.ok && list.value.skipped).toBe(1);
  });

  it("reports blocked storage", async () => {
    control.unavailable = true;
    expect((await listCvs()).ok).toBe(false);
    expect((await saveCv(make("a", "x"))).ok).toBe(false);
    expect((await deleteAllData()).ok).toBe(false);
  });
});
