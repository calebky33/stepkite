import { describe, expect, it } from "vitest";
import { applicationsPerWeek, interviewRate, offers, responseRate, timeInStage } from "./metrics";
import { DEFAULT_STAGES, type Activity, type Job } from "./schema";
import { NOW, makeJob } from "./fixtures.test-util";

const applied = (id: string, over: Partial<Job> = {}) =>
  makeJob({ id, stageId: "stage-applied", appliedAt: "2026-03-25T00:00:00.000Z", ...over });
const act = (id: string, jobId: string, type: Activity["type"], at: string): Activity => ({
  id,
  jobId,
  type,
  at,
});

describe("applicationsPerWeek", () => {
  it("is null with no applications at all", () => {
    expect(applicationsPerWeek([], NOW, 4)).toBeNull();
    expect(applicationsPerWeek([makeJob()], NOW, 4)).toBeNull();
  });
  it("is null for a window of zero weeks", () => {
    expect(applicationsPerWeek([applied("a")], NOW, 0)).toBeNull();
  });
  it("counts applications inside the window and skips archived", () => {
    const jobs = [
      applied("a"),
      applied("b", { appliedAt: "2026-03-10T00:00:00.000Z" }),
      applied("old", { appliedAt: "2025-01-01T00:00:00.000Z" }),
      applied("arch", { archivedAt: "2026-03-30T00:00:00.000Z" }),
    ];
    expect(applicationsPerWeek(jobs, NOW, 4)).toBe(0.5);
  });
  it("is zero, not null, when you applied but none fall in the window", () => {
    const old = applied("old", { appliedAt: "2025-01-01T00:00:00.000Z" });
    expect(applicationsPerWeek([old], NOW, 4)).toBe(0);
  });
});

describe("responseRate and interviewRate", () => {
  it("are null with no applied jobs", () => {
    expect(responseRate([], [], DEFAULT_STAGES)).toBeNull();
    expect(interviewRate([makeJob()], [], DEFAULT_STAGES)).toBeNull();
  });
  it("one applied job with no reply is 0", () => {
    expect(responseRate([applied("a")], [], DEFAULT_STAGES)).toBe(0);
  });
  it("counts jobs now in screening, interview or offer", () => {
    const jobs = [
      applied("a"),
      applied("b", { stageId: "stage-screening" }),
      applied("c", { stageId: "stage-interview" }),
      applied("d", { stageId: "stage-offer" }),
    ];
    expect(responseRate(jobs, [], DEFAULT_STAGES)).toBe(0.75);
    expect(interviewRate(jobs, [], DEFAULT_STAGES)).toBe(0.5);
  });
  it("counts a job that had an interview but later closed", () => {
    const jobs = [applied("a", { stageId: "stage-rejected" })];
    const acts = [act("x", "a", "interview", "2026-03-28T00:00:00.000Z")];
    expect(interviewRate(jobs, acts, DEFAULT_STAGES)).toBe(1);
    expect(responseRate(jobs, acts, DEFAULT_STAGES)).toBe(1);
  });
  it("ignores archived jobs", () => {
    const jobs = [applied("a", { archivedAt: NOW })];
    expect(responseRate(jobs, [], DEFAULT_STAGES)).toBeNull();
  });
});

describe("offers", () => {
  it("counts live jobs in an offer stage; 0 when none", () => {
    expect(offers([], DEFAULT_STAGES)).toBe(0);
    const jobs = [
      applied("a", { stageId: "stage-offer" }),
      applied("b", { stageId: "stage-offer", archivedAt: NOW }),
    ];
    expect(offers(jobs, DEFAULT_STAGES)).toBe(1);
  });
});

describe("timeInStage", () => {
  it("is null when no live job sits in the stage", () => {
    expect(timeInStage([], [], "stage-applied", NOW)).toBeNull();
    expect(timeInStage([makeJob({ archivedAt: NOW })], [], "stage-saved", NOW)).toBeNull();
  });
  it("uses savedAt when the job never moved", () => {
    const j = makeJob({ savedAt: "2026-03-29T09:00:00.000Z" });
    expect(timeInStage([j], [], "stage-saved", NOW)).toBe(3);
  });
  it("measures from the latest move and averages jobs", () => {
    const jobs = [applied("a"), applied("b")];
    const acts = [
      act("1", "a", "moved", "2026-03-20T09:00:00.000Z"),
      act("2", "a", "applied", "2026-03-30T09:00:00.000Z"),
      act("3", "b", "moved", "2026-03-29T09:00:00.000Z"),
    ];
    expect(timeInStage(jobs, acts, "stage-applied", NOW)).toBe(2.5);
  });
  it("same-day move is 0 days, not null", () => {
    const acts = [act("1", "a", "moved", NOW)];
    expect(timeInStage([applied("a")], acts, "stage-applied", NOW)).toBe(0);
  });
});

describe("metrics edge cases", () => {
  it("counts a rejected job that had an interview in the response rate", () => {
    const jobs = [applied("a", { stageId: "stage-rejected" }), applied("b")];
    const acts = [act("x", "a", "interview", "2026-03-28T00:00:00.000Z")];
    expect(responseRate(jobs, acts, DEFAULT_STAGES)).toBe(0.5);
  });
  it("handles many activities without spreading them", () => {
    const j = applied("a");
    const acts = Array.from({ length: 200_000 }, (_, i) =>
      act(`m${i}`, "a", "moved", new Date(Date.UTC(2026, 2, 26) + i * 1000).toISOString()),
    );
    const days = timeInStage([j], acts, "stage-applied", NOW);
    expect(days).not.toBeNull();
  });
  it("uses the latest move for each job", () => {
    const acts = [
      act("1", "a", "moved", "2026-03-30T09:00:00.000Z"),
      act("2", "a", "applied", "2026-03-31T09:00:00.000Z"),
    ];
    expect(timeInStage([applied("a")], acts, "stage-applied", NOW)).toBeCloseTo(1, 5);
  });
});
