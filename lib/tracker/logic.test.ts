import { describe, expect, it } from "vitest";
import {
  addNote,
  deleteActivity,
  deleteStage,
  editActivity,
  moveJob,
  renameStage,
  reorderStages,
  sortJobs,
  stageNameProblem,
} from "./logic";
import { DEFAULT_STAGES, type Activity, type Job } from "./schema";

const NOW = "2026-04-01T09:00:00.000Z";
const job = (over: Partial<Job> = {}): Job => ({
  id: "j1",
  title: "Dev",
  company: "Acme",
  stage: "saved",
  stageId: "stage-saved",
  notes: "",
  savedAt: "2026-03-01T00:00:00.000Z",
  updatedAt: "2026-03-01T00:00:00.000Z",
  ...over,
});

describe("moveJob", () => {
  it("moves, writes an activity and stamps appliedAt once", () => {
    const a = moveJob(job(), "stage-applied", DEFAULT_STAGES, NOW, "a1");
    expect(a?.job.stageId).toBe("stage-applied");
    expect(a?.job.appliedAt).toBe(NOW);
    expect(a?.job.updatedAt).toBe(NOW);
    expect(a?.activity).toMatchObject({ id: "a1", jobId: "j1", type: "applied", at: NOW });
    if (!a) return;
    const later = "2026-05-01T00:00:00.000Z";
    const b = moveJob(a.job, "stage-screening", DEFAULT_STAGES, later, "a2");
    expect(b?.job.appliedAt).toBe(NOW);
    expect(b?.activity.type).toBe("moved");
    if (!b) return;
    const c = moveJob(b.job, "stage-applied", DEFAULT_STAGES, later, "a3");
    expect(c?.job.appliedAt).toBe(NOW);
    expect(c?.activity.type).toBe("moved");
  });

  it("returns null for an unknown stage or the same stage", () => {
    expect(moveJob(job(), "nope", DEFAULT_STAGES, NOW, "a")).toBeNull();
    expect(moveJob(job(), "stage-saved", DEFAULT_STAGES, NOW, "a")).toBeNull();
  });
});

describe("notes and timeline", () => {
  const act = (id: string): Activity => ({ id, jobId: "j1", type: "note", text: "x", at: NOW });

  it("adds a note activity and rejects empty or long text", () => {
    expect(addNote("j1", "  hello ", NOW, "n1")).toMatchObject({ type: "note", text: "hello" });
    expect(addNote("j1", "   ", NOW, "n1")).toBeNull();
    expect(addNote("j1", "x".repeat(1001), NOW, "n1")).toBeNull();
  });

  it("edits and deletes by id", () => {
    const list = [act("1"), act("2")];
    expect(editActivity(list, "2", "new")[1]?.text).toBe("new");
    expect(editActivity(list, "9", "new")).toEqual(list);
    expect(editActivity(list, "2", "")).toEqual(list);
    expect(deleteActivity(list, "1").map((a) => a.id)).toEqual(["2"]);
    expect(list).toHaveLength(2);
  });
});

describe("sortJobs", () => {
  const jobs = [
    job({ id: "a", title: "B", company: "Z" }),
    job({ id: "b", title: "a", company: "Y", appliedAt: "2026-03-05T00:00:00.000Z" }),
    job({ id: "c", title: "C", company: "Y" }),
  ];

  it("sorts by title ignoring case, both ways", () => {
    expect(sortJobs(jobs, "title", "asc").map((j) => j.id)).toEqual(["b", "a", "c"]);
    expect(sortJobs(jobs, "title", "desc").map((j) => j.id)).toEqual(["c", "a", "b"]);
  });

  it("is stable on ties and puts missing values last", () => {
    expect(sortJobs(jobs, "company", "asc").map((j) => j.id)).toEqual(["b", "c", "a"]);
    expect(sortJobs(jobs, "appliedAt", "asc").map((j) => j.id)).toEqual(["b", "a", "c"]);
    expect(sortJobs(jobs, "appliedAt", "desc").map((j) => j.id)).toEqual(["b", "a", "c"]);
  });

  it("does not mutate", () => {
    const copy = [...jobs];
    sortJobs(jobs, "title", "desc");
    expect(jobs).toEqual(copy);
  });
});

describe("stages", () => {
  it("reorders and renumbers", () => {
    const r = reorderStages(DEFAULT_STAGES, "stage-offer", 0);
    expect(r[0]?.id).toBe("stage-offer");
    expect(r.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(reorderStages(DEFAULT_STAGES, "nope", 0)).toEqual(DEFAULT_STAGES);
  });

  it("renames within 1 to 40 characters", () => {
    expect(renameStage(DEFAULT_STAGES, "stage-offer", " Offers ")[4]?.name).toBe("Offers");
    expect(renameStage(DEFAULT_STAGES, "stage-offer", "")).toEqual(DEFAULT_STAGES);
    expect(renameStage(DEFAULT_STAGES, "stage-offer", "x".repeat(41))).toEqual(DEFAULT_STAGES);
  });

  it("refuses to delete a stage that holds jobs", () => {
    const held = deleteStage(DEFAULT_STAGES, "stage-offer", [job({ stageId: "stage-offer" })]);
    expect(held).toEqual({ ok: false, reason: "has-jobs" });
    const ok = deleteStage(DEFAULT_STAGES, "stage-offer", [job()]);
    expect(ok.ok && ok.stages).toHaveLength(6);
  });
});

describe("moveJob without applying first", () => {
  it("stamps appliedAt when a saved job goes straight to interview", () => {
    const r = moveJob(job(), "stage-interview", DEFAULT_STAGES, NOW, "a1");
    expect(r?.job.appliedAt).toBe(NOW);
    expect(r?.activity.type).toBe("moved");
  });
  it("keeps an existing appliedAt and does not stamp on a move to saved", () => {
    const had = job({ stageId: "stage-offer", appliedAt: "2026-03-02T00:00:00.000Z" });
    expect(moveJob(had, "stage-interview", DEFAULT_STAGES, NOW, "a")?.job.appliedAt).toBe(
      "2026-03-02T00:00:00.000Z",
    );
    const back = job({ stageId: "stage-applied" });
    expect(moveJob(back, "stage-saved", DEFAULT_STAGES, NOW, "a")?.job.appliedAt).toBeUndefined();
  });
  it("uses the applied activity type only for the applied kind", () => {
    expect(moveJob(job(), "stage-applied", DEFAULT_STAGES, NOW, "a")?.activity.type).toBe(
      "applied",
    );
  });
});

describe("stage rules", () => {
  it("rejects a duplicate name ignoring case, but allows keeping its own", () => {
    expect(renameStage(DEFAULT_STAGES, "stage-offer", " applied ")).toEqual(DEFAULT_STAGES);
    expect(renameStage(DEFAULT_STAGES, "stage-offer", "OFFER")[4]?.name).toBe("OFFER");
    expect(stageNameProblem(DEFAULT_STAGES, "stage-offer", "Saved")).toBe("duplicate");
  });
  it("refuses to delete the last saved stage", () => {
    expect(deleteStage(DEFAULT_STAGES, "stage-saved", [])).toEqual({
      ok: false,
      reason: "last-saved",
    });
    const two = [...DEFAULT_STAGES, { id: "s2", name: "Later", order: 7, kind: "saved" as const }];
    expect(deleteStage(two, "stage-saved", []).ok).toBe(true);
  });
  it("sorts text with locale rules", () => {
    const jobs = [job({ id: "a", title: "Zebra" }), job({ id: "b", title: "Éclair" })];
    expect(sortJobs(jobs, "title", "asc").map((j) => j.id)).toEqual(["b", "a"]);
  });
});
