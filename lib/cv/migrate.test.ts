import { withoutNewSections } from "./testing";
import { describe, expect, it } from "vitest";
import { buildBlocks } from "./paginate";
import { emptyCv, migrateCv, SECTION_KEYS, storedCvSchema } from "./schema";

const NOW = "2026-01-01T00:00:00.000Z";

describe("schema migration", () => {
  it("loads a version 1 save and adds the new sections empty and last", () => {
    const old = withoutNewSections(emptyCv("a", "uk", NOW));
    const parsed = storedCvSchema.safeParse({
      ...old,
      schemaVersion: 1,
      sectionOrder: ["skills", "summary"],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.schemaVersion).toBe(2);
    expect(parsed.data.certifications).toEqual([]);
    expect(parsed.data.interests).toBe("");
    expect(parsed.data.references).toEqual([]);
    expect(parsed.data.sectionOrder.slice(0, 2)).toEqual(["skills", "summary"]);
    expect(new Set(parsed.data.sectionOrder)).toEqual(new Set(SECTION_KEYS));
  });

  it("caps the new sections", () => {
    const base = emptyCv("a", "uk", NOW);
    const ref = { id: "r", name: "N", role: "", contact: "" };
    expect(storedCvSchema.safeParse({ ...base, references: Array(5).fill(ref) }).success).toBe(
      false,
    );
    expect(storedCvSchema.safeParse({ ...base, interests: "x".repeat(501) }).success).toBe(false);
    const cert = { id: "c", name: "N", issuer: "", date: null };
    expect(
      storedCvSchema.safeParse({ ...base, certifications: Array(16).fill(cert) }).success,
    ).toBe(false);
  });

  it("makes no blocks for empty new sections", () => {
    expect(buildBlocks(emptyCv("a", "uk", NOW))).toEqual([]);
  });

  it("keeps only valid, unique order keys when upgrading", () => {
    const old = withoutNewSections(emptyCv("a", "uk", NOW));
    const parsed = storedCvSchema.safeParse({
      ...old,
      schemaVersion: 1,
      sectionOrder: ["skills", "skills", "bogus", 7, "summary", "summary"],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.sectionOrder.slice(0, 2)).toEqual(["skills", "summary"]);
    expect(parsed.data.sectionOrder).toHaveLength(SECTION_KEYS.length);
    expect(new Set(parsed.data.sectionOrder).size).toBe(SECTION_KEYS.length);
  });

  it("refuses a version it does not know", () => {
    const base = emptyCv("a", "uk", NOW);
    expect(storedCvSchema.safeParse({ ...base, schemaVersion: 3 }).success).toBe(false);
    expect(migrateCv({ ...base, schemaVersion: 3 })).toMatchObject({ schemaVersion: 3 });
  });

  it("refuses duplicate or unknown order keys on a current save", () => {
    const base = emptyCv("a", "uk", NOW);
    expect(storedCvSchema.safeParse({ ...base, sectionOrder: ["skills", "nope"] }).success).toBe(
      false,
    );
    expect(storedCvSchema.safeParse({ ...base, sectionOrder: ["skills", "skills"] }).success).toBe(
      false,
    );
  });

  it("round trips a version 2 save unchanged", () => {
    const base = emptyCv("a", "uk", NOW);
    const parsed = storedCvSchema.safeParse(JSON.parse(JSON.stringify(base)));
    expect(parsed.success && parsed.data).toEqual(base);
  });

  it("only allows http and https links", () => {
    const base = emptyCv("a", "uk", NOW);
    const withLink = (url: string) => ({
      ...base,
      contact: { ...base.contact, links: [{ label: "Site", url }] },
    });
    const ok = (url: string) => storedCvSchema.safeParse(withLink(url)).success;
    expect(ok("https://example.com")).toBe(true);
    expect(ok("javascript:alert(1)")).toBe(false);
  });
});
