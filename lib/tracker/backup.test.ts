import { describe, expect, it } from "vitest";
import { TRACKER_BACKUP_MAX_BYTES, buildTrackerBackup, parseTrackerBackup } from "./backup";
import { DEFAULT_STAGES } from "./schema";
import { makeJob } from "./fixtures.test-util";

const data = {
  jobs: [makeJob({ tags: ["a"], contactIds: ["c1"] })],
  stages: [...DEFAULT_STAGES],
  activities: [
    { id: "a1", jobId: "j1", type: "note" as const, text: "hi", at: "2026-03-01T00:00:00.000Z" },
  ],
  interviews: [{ id: "i1", jobId: "j1", at: "2026-04-05T10:00:00.000Z", kind: "phone" as const }],
  contacts: [{ id: "c1", name: "Sam" }],
};

describe("tracker backup", () => {
  it("round trips", () => {
    const text = buildTrackerBackup(data, new Date("2026-04-01T09:00:00Z"));
    const out = parseTrackerBackup(text);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data.jobs[0]?.tags).toEqual(["a"]);
      expect(out.data.contacts).toEqual(data.contacts);
      expect(out.data.interviews).toHaveLength(1);
    }
  });
  it("rejects not json, wrong shape, too big, and empty", () => {
    expect(parseTrackerBackup("{{")).toEqual({ ok: false, error: "not-json" });
    expect(parseTrackerBackup('{"kind":"other"}')).toMatchObject({
      ok: false,
      error: "wrong-shape",
    });
    expect(parseTrackerBackup("x", TRACKER_BACKUP_MAX_BYTES + 1)).toEqual({
      ok: false,
      error: "too-big",
    });
    const empty = buildTrackerBackup(
      { jobs: [], stages: [], contacts: [], activities: [], interviews: [] },
      new Date(),
    );
    expect(parseTrackerBackup(empty)).toEqual({ ok: false, error: "empty" });
  });
  it("rejects a damaged job and drops duplicate ids", () => {
    const bad = JSON.parse(buildTrackerBackup(data, new Date())) as {
      jobs: Record<string, unknown>[];
    };
    bad.jobs = [{ ...bad.jobs[0], title: "" }];
    expect(parseTrackerBackup(JSON.stringify(bad))).toMatchObject({
      ok: false,
      error: "wrong-shape",
    });
    const dup = { ...data, jobs: [makeJob(), makeJob()] };
    const out = parseTrackerBackup(buildTrackerBackup(dup, new Date()));
    expect(out.ok && out.data.jobs.length).toBe(1);
  });
});

describe("backup consistency", () => {
  const at = new Date("2026-04-01T09:00:00Z");
  const run = (over: Partial<typeof data>) => parseTrackerBackup(buildTrackerBackup({ ...data, ...over }, at));

  it("names the count and first path of a shape problem, never values", () => {
    const bad = JSON.parse(buildTrackerBackup(data, at)) as { jobs: Record<string, unknown>[] };
    bad.jobs = [{ ...bad.jobs[0], title: "SECRET-TITLE", url: "nope" }];
    const out = parseTrackerBackup(JSON.stringify(bad));
    expect(out).toMatchObject({ ok: false, error: "wrong-shape", issueCount: 1 });
    expect(out.ok === false && out.firstPath).toBe("jobs.0.url");
    expect(JSON.stringify(out)).not.toContain("SECRET");
  });
  it("remaps jobs with a missing stage to the saved stage and counts them", () => {
    const out = run({ jobs: [makeJob({ stageId: "stage-gone" })] });
    expect(out.ok && out.data.jobs[0]?.stageId).toBe("stage-saved");
    expect(out.ok && out.report.remappedJobs).toBe(1);
  });
  it("prunes activities and interviews of missing jobs and dead contact links", () => {
    const out = run({
      jobs: [makeJob({ contactIds: ["c1", "ghost"] })],
      activities: [...data.activities, { ...data.activities[0]!, id: "a2", jobId: "nope" }],
      interviews: [...data.interviews, { ...data.interviews[0]!, id: "i2", jobId: "nope" }],
    });
    expect(out.ok && out.report).toMatchObject({
      prunedActivities: 1,
      prunedInterviews: 1,
      prunedContactLinks: 1,
    });
    expect(out.ok && out.data.jobs[0]?.contactIds).toEqual(["c1"]);
  });
  it("reports dropped duplicates", () => {
    const out = run({ jobs: [makeJob(), makeJob()] });
    expect(out.ok && out.report.droppedDuplicates).toBe(1);
  });
  it("accepts a backup with no jobs when other data exists", () => {
    const out = run({ jobs: [], activities: [], interviews: [] });
    expect(out.ok && out.data.contacts).toHaveLength(1);
  });
  it("rejects a bad exportedAt", () => {
    const bad = JSON.parse(buildTrackerBackup(data, at)) as Record<string, unknown>;
    bad.exportedAt = "last tuesday";
    expect(parseTrackerBackup(JSON.stringify(bad))).toMatchObject({ error: "wrong-shape" });
  });
  it("carries unreadable rows in the file without restoring them", () => {
    const text = buildTrackerBackup(data, at, { jobs: [{ junk: true }] });
    expect(text).toContain("junk");
    const out = parseTrackerBackup(text);
    expect(out.ok && out.unreadable).toBe(1);
    expect(out.ok && out.data.jobs).toHaveLength(1);
  });

  const file = (over: Record<string, unknown>) =>
    JSON.stringify({
      kind: "stepkite-tracker-backup",
      version: 1,
      exportedAt: "2026-04-01T09:00:00.000Z",
      jobs: [],
      stages: [],
      activities: [],
      interviews: [],
      contacts: [],
      ...over,
    });

  it("adds the default saved stage when the file has no stages", () => {
    const out = parseTrackerBackup(file({ jobs: [makeJob({ stageId: "gone" })] }));
    expect(out.ok && out.data.stages.map((s) => s.kind)).toEqual(["saved"]);
    expect(out.ok && out.data.jobs[0]?.stageId).toBe("stage-saved");
    expect(out.ok && out.report).toMatchObject({ addedDefaultStage: true, remappedJobs: 1 });
  });

  it("remaps to the first stage when there is no saved stage", () => {
    const stages = [
      { id: "b", name: "B", order: 2, kind: "offer" },
      { id: "a", name: "A", order: 1, kind: "applied" },
    ];
    const out = parseTrackerBackup(file({ stages, jobs: [makeJob({ stageId: "gone" })] }));
    expect(out.ok && out.data.jobs[0]?.stageId).toBe("a");
    expect(out.ok && out.report).toMatchObject({ addedDefaultStage: false, remappedJobs: 1 });
  });

  it("reports jobs that had neither stage nor stageId", () => {
    const bare: Record<string, unknown> = { ...makeJob({ id: "bare" }) };
    delete bare.stage;
    delete bare.stageId;
    const out = parseTrackerBackup(
      file({ stages: [...DEFAULT_STAGES], jobs: [bare, makeJob({ id: "ok" })] }),
    );
    expect(out.ok && out.report.defaultedStageJobs).toBe(1);
    expect(out.ok && out.data.jobs.find((j) => j.id === "bare")?.stageId).toBe("stage-saved");
  });
});
