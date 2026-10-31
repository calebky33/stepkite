import { beforeEach, describe, expect, it } from "vitest";
import { COLLECTIONS as REAL } from "./db";
import {
  COLLECTIONS as MEMORY,
  listIds,
  readAll,
  resetMemoryDb,
  seed,
  writeItem,
} from "./memoryDb";
import { activitySchema } from "@/lib/tracker/schema";

describe("collections", () => {
  beforeEach(() => resetMemoryDb());

  it("lists tracker-activity in both the real and memory storage", () => {
    expect(REAL).toContain("tracker-activity");
    expect(MEMORY).toBe(REAL);
  });

  it("stores activities and counts unreadable rows", async () => {
    const a = {
      id: "a1",
      jobId: "j1",
      type: "note" as const,
      text: "hi",
      at: "2026-04-01T09:00:00.000Z",
    };
    expect((await writeItem("tracker-activity", "a1", activitySchema, a)).ok).toBe(true);
    seed("tracker-activity", "bad", { nope: true });
    const all = await readAll("tracker-activity", activitySchema);
    expect(all.ok && all.value).toEqual({ items: [a], skipped: 1, skippedValues: [{ nope: true }] });
    const ids = await listIds("tracker-activity");
    expect(ids.ok && ids.value.sort()).toEqual(["a1", "bad"]);
  });
});
