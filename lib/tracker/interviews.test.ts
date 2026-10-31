import { describe, expect, it } from "vitest";
import { logInterview, upcomingInterviews } from "./interviews";
import { interviewSchema, type Interview } from "./schema";
import { NOW } from "./fixtures.test-util";

const iv = (id: string, at: string, over: Partial<Interview> = {}): Interview => ({
  id,
  jobId: "j1",
  at,
  kind: "video",
  ...over,
});

describe("interviewSchema", () => {
  it("accepts the three kinds and rejects others", () => {
    expect(interviewSchema.safeParse(iv("a", NOW)).success).toBe(true);
    expect(interviewSchema.safeParse({ ...iv("a", NOW), kind: "chat" }).success).toBe(false);
    expect(interviewSchema.safeParse({ ...iv("a", "soon") }).success).toBe(false);
  });
});

describe("upcomingInterviews", () => {
  it("keeps future ones, soonest first, and includes one starting now", () => {
    const list = [
      iv("late", "2026-04-09T09:00:00.000Z"),
      iv("past", "2026-03-30T09:00:00.000Z"),
      iv("now", NOW),
      iv("soon", "2026-04-02T09:00:00.000Z"),
    ];
    expect(upcomingInterviews(list, NOW).map((i) => i.id)).toEqual(["now", "soon", "late"]);
  });
  it("handles empty input and does not mutate", () => {
    expect(upcomingInterviews([], NOW)).toEqual([]);
    const list = [iv("b", "2026-05-01T00:00:00.000Z"), iv("a", "2026-04-05T00:00:00.000Z")];
    upcomingInterviews(list, NOW);
    expect(list[0]?.id).toBe("b");
  });
});

describe("logInterview", () => {
  it("builds an interview activity with no people or prep text", () => {
    const a = logInterview(
      iv("i1", "2026-04-05T10:00:00.000Z", { people: "Sam Lee", prep: "x" }),
      NOW,
      "act1",
    );
    expect(a).toEqual({
      id: "act1",
      jobId: "j1",
      type: "interview",
      text: "Video interview",
      at: NOW,
    });
  });
});
