import { describe, expect, it } from "vitest";
import { emptyCv } from "./schema";
import { addSnapshot, SNAPSHOT_EVERY_MS, SNAPSHOT_LIMIT, type SnapshotSet } from "./snapshots";

const cv = emptyCv("a", "uk", "2026-01-01T00:00:00.000Z");

describe("snapshots", () => {
  it("keeps one copy per five minutes", () => {
    let set: SnapshotSet = { id: "a", copies: [] };
    set = addSnapshot(set, { at: 0, cv });
    const same = addSnapshot(set, { at: SNAPSHOT_EVERY_MS - 1, cv });
    expect(same).toBe(set);
    set = addSnapshot(set, { at: SNAPSHOT_EVERY_MS, cv });
    expect(set.copies).toHaveLength(2);
  });

  it("keeps the last ten", () => {
    let set: SnapshotSet = { id: "a", copies: [] };
    for (let i = 0; i < 15; i += 1) set = addSnapshot(set, { at: i * SNAPSHOT_EVERY_MS, cv });
    expect(set.copies).toHaveLength(SNAPSHOT_LIMIT);
    expect(set.copies[0]?.at).toBe(5 * SNAPSHOT_EVERY_MS);
  });
});
