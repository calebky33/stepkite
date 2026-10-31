import { describe, expect, it } from "vitest";
import { addTag, filterByTag, removeTag } from "./tags";
import { jobSchema } from "./schema";
import { makeJob } from "./fixtures.test-util";

describe("job schema tags", () => {
  const raw = {
    id: "j",
    title: "T",
    company: "C",
    stage: "saved",
    updatedAt: "2026-03-01T00:00:00.000Z",
  };
  it("still parses old rows with no tags", () => {
    expect(jobSchema.safeParse(raw).success).toBe(true);
  });
  it("trims, and rejects too many, too long, empty or repeated tags", () => {
    expect(jobSchema.parse({ ...raw, tags: [" remote "] }).tags).toEqual(["remote"]);
    const eleven = Array.from({ length: 11 }, (_, i) => `t${i}`);
    expect(jobSchema.safeParse({ ...raw, tags: eleven }).success).toBe(false);
    expect(jobSchema.safeParse({ ...raw, tags: ["x".repeat(31)] }).success).toBe(false);
    expect(jobSchema.safeParse({ ...raw, tags: ["  "] }).success).toBe(false);
    expect(jobSchema.safeParse({ ...raw, tags: ["a", "A"] }).success).toBe(false);
  });
});

describe("addTag and removeTag", () => {
  it("adds a trimmed tag", () => {
    expect(addTag(makeJob(), "  remote ")?.tags).toEqual(["remote"]);
  });
  it("refuses empty, long, duplicate (any case) and the eleventh tag", () => {
    expect(addTag(makeJob(), "   ")).toBeNull();
    expect(addTag(makeJob(), "x".repeat(31))).toBeNull();
    expect(addTag(makeJob({ tags: ["Remote"] }), "remote")).toBeNull();
    const full = makeJob({ tags: Array.from({ length: 10 }, (_, i) => `t${i}`) });
    expect(addTag(full, "extra")).toBeNull();
  });
  it("removes a tag and ignores a missing one", () => {
    const j = makeJob({ tags: ["a", "b"] });
    expect(removeTag(j, "a").tags).toEqual(["b"]);
    expect(removeTag(j, "z")).toBe(j);
  });
});

describe("filterByTag", () => {
  const jobs = [
    makeJob({ id: "1", tags: ["Remote"] }),
    makeJob({ id: "2" }),
    makeJob({ id: "3", tags: ["onsite"] }),
  ];
  it("matches case-insensitively", () => {
    expect(filterByTag(jobs, "remote").map((j) => j.id)).toEqual(["1"]);
  });
  it("returns all for a blank tag", () => {
    expect(filterByTag(jobs, " ")).toHaveLength(3);
  });
});
