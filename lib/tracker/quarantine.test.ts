import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listIds, resetMemoryDb } from "@/lib/storage/memoryDb";
import { QUARANTINE_MAX, buildQuarantine, contentHash, saveQuarantine } from "./quarantine";

vi.mock("@/lib/storage/db", () => import("@/lib/storage/memoryDb"));

describe("quarantine", () => {
  beforeEach(() => resetMemoryDb());

  it("hashes with SHA-256 and ignores key order", async () => {
    expect(await contentHash("abc")).toBe(createHash("sha256").update('"abc"').digest("hex"));
    expect(await contentHash({ a: 1, b: 2 })).toBe(await contentHash({ b: 2, a: 1 }));
    expect(await contentHash({ a: 1 })).not.toBe(await contentHash({ a: 2 }));
  });

  it("merges repeats and caps entries, counting dropped", async () => {
    const raws = [{ n: 1 }, { n: 1 }, { n: 2 }, { n: 3 }];
    const out = await buildQuarantine("jobs", raws, "2026-04-01T00:00:00.000Z", 2);
    expect(out.entries).toHaveLength(2);
    expect(out.dropped).toBe(1);
    expect(out.entries[0]?.id).toMatch(/^jobs-[0-9a-f]{40}$/);
  });

  it("stops saving at the total cap", async () => {
    const raws = Array.from({ length: QUARANTINE_MAX + 3 }, (_, n) => ({ n }));
    const { entries } = await buildQuarantine("jobs", raws, "2026-04-01T00:00:00.000Z", 10_000);
    const out = await saveQuarantine(entries);
    expect(out).toEqual({ saved: QUARANTINE_MAX, failed: 0, dropped: 3 });
    const ids = await listIds("tracker-quarantine");
    expect(ids.ok && ids.value.length).toBe(QUARANTINE_MAX);
  });
});
