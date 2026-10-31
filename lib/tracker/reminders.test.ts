import { describe, expect, it } from "vitest";
import { orderedReminders, overdueJobs, upcomingReminders } from "./reminders";
import type { Job } from "./schema";
import { NOW, makeJob } from "./fixtures.test-util";

const step = (id: string, dueAt: string, over: Partial<Job> = {}) =>
  makeJob({ id, nextStep: { text: "Call", dueAt }, ...over });

describe("reminders", () => {
  const jobs = [
    step("future2", "2026-04-10T00:00:00.000Z"),
    step("overdue2", "2026-03-30T00:00:00.000Z"),
    step("future1", "2026-04-02T00:00:00.000Z"),
    step("overdue1", "2026-03-01T00:00:00.000Z"),
    step("archived", "2026-03-01T00:00:00.000Z", { archivedAt: "2026-03-05T00:00:00.000Z" }),
    makeJob({ id: "none" }),
  ];
  it("lists overdue jobs oldest first and skips archived and no step", () => {
    expect(overdueJobs(jobs, NOW).map((j) => j.id)).toEqual(["overdue1", "overdue2"]);
  });
  it("lists upcoming by due date, counting due right now as upcoming", () => {
    const withNow = [...jobs, step("now", NOW)];
    expect(upcomingReminders(withNow, NOW).map((j) => j.id)).toEqual(["now", "future1", "future2"]);
  });
  it("puts overdue first, then upcoming", () => {
    expect(orderedReminders(jobs, NOW).map((j) => j.id)).toEqual([
      "overdue1",
      "overdue2",
      "future1",
      "future2",
    ]);
  });
  it("handles empty", () => {
    expect(orderedReminders([], NOW)).toEqual([]);
  });
});
