import { describe, expect, it, vi } from "vitest";
import { control, resetMemoryDb } from "@/lib/storage/memoryDb";
import { migrateJob, migrateJobResult } from "./migrate";
import { interviewRate } from "./metrics";
import { quarantineEntries, saveQuarantine } from "./quarantine";
import { DEFAULT_STAGES } from "./schema";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

const T = "2026-03-01T10:00:00.000Z";
const old = (stage: string) => ({ id: "j1", title: "Dev", company: "Acme", stage, updatedAt: T });

describe("migrateJob", () => {
  it.each([
    ["saved", "stage-saved"],
    ["applied", "stage-applied"],
    ["interview", "stage-interview"],
    ["offer", "stage-offer"],
    ["closed", "stage-rejected"],
  ])("maps old %s to %s and fills savedAt", (stage, id) => {
    const job = migrateJob(old(stage));
    expect(job?.stageId).toBe(id);
    expect(job?.savedAt).toBe(T);
    expect(job?.notes).toBe("");
  });

  it("passes a new shape through unchanged", () => {
    const fresh = {
      ...old("applied"),
      stageId: "stage-screening",
      savedAt: "2026-02-01T00:00:00.000Z",
      notes: "hi",
    };
    const job = migrateJob(fresh);
    expect(job).toMatchObject({ stageId: "stage-screening", savedAt: fresh.savedAt, notes: "hi" });
  });

  it("returns null for junk", () => {
    const junk: unknown[] = [
      null,
      undefined,
      4,
      "x",
      [],
      {},
      { ...old("saved"), title: "" },
      old("nope"),
    ];
    for (const bad of junk) {
      expect(migrateJob(bad)).toBeNull();
    }
  });
});

describe("migrateJobResult", () => {
  it("deletes the legacy stage field", () => {
    const job = migrateJob(old("offer"));
    expect(job && "stage" in job).toBe(false);
    const fresh = migrateJob({ ...old("offer"), stageId: "stage-offer" });
    expect(fresh && "stage" in fresh).toBe(false);
  });
  it("backfills appliedAt for legacy rows past saved, from savedAt then updatedAt", () => {
    expect(migrateJob(old("interview"))?.appliedAt).toBe(T);
    const withSaved = migrateJob({ ...old("closed"), savedAt: "2026-02-01T00:00:00.000Z" });
    expect(withSaved?.appliedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(migrateJob(old("saved"))?.appliedAt).toBeUndefined();
    const kept = migrateJob({ ...old("applied"), appliedAt: "2026-02-15T00:00:00.000Z" });
    expect(kept?.appliedAt).toBe("2026-02-15T00:00:00.000Z");
  });
  it("does not backfill rows that already use stageId", () => {
    expect(migrateJob({ ...old("applied"), stageId: "stage-offer" })?.appliedAt).toBeUndefined();
  });
  it("hands back the original for unknown or unreadable rows", () => {
    const bad = old("nope");
    const r = migrateJobResult(bad);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.raw).toBe(bad);
    expect(migrateJobResult(null)).toEqual({ ok: false, raw: null });
    expect(migrateJobResult("x").ok).toBe(false);
  });
  it("does not read inherited stage names", () => {
    expect(migrateJobResult(old("constructor")).ok).toBe(false);
    expect(migrateJobResult(old("__proto__")).ok).toBe(false);
  });
  it("a legacy interview row shows up in metrics", () => {
    const job = migrateJob(old("interview"));
    expect(job).not.toBeNull();
    if (job) expect(interviewRate([job], [], DEFAULT_STAGES)).toBe(1);
  });
});

describe("quarantine", () => {
  it("wraps raws and keeps them untouched", () => {
    const raw = { a: 1 };
    const e = quarantineEntries("jobs", [raw], T, (i) => `n${i}`);
    expect(e).toEqual([{ id: "jobs-n0", from: "jobs", quarantinedAt: T, raw }]);
    expect(e[0]?.raw).toBe(raw);
  });
  it("saves copies and counts failures", async () => {
    resetMemoryDb();
    const e = quarantineEntries("jobs", [{ a: 1 }, 5], T, (i) => `n${i}`);
    expect(await saveQuarantine(e)).toEqual({ saved: 2, failed: 0, dropped: 0 });
    control.unavailable = true;
    expect(await saveQuarantine(e)).toEqual({ saved: 0, failed: 2, dropped: 0 });
    resetMemoryDb();
  });
});
