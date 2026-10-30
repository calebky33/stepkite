import { withoutNewSections } from "./testing";
import { describe, expect, it } from "vitest";
import { BACKUP_MAX_BYTES, buildBackup, parseBackup } from "./backup";
import { emptyCv } from "./schema";

const NOW = "2026-01-01T00:00:00.000Z";
const cv = { ...emptyCv("a", "uk", NOW), title: "Graduate UK" };
const wrap = (cvs: unknown[]) =>
  JSON.stringify({ kind: "stepkite-cv-backup", version: 1, exportedAt: NOW, cvs });

describe("backup import", () => {
  it("round trips", () => {
    const parsed = parseBackup(buildBackup([cv], new Date(NOW)));
    expect(parsed.ok && parsed.cvs[0]?.title).toBe("Graduate UK");
  });

  it("refuses bad JSON", () => {
    expect(parseBackup("{nope")).toEqual({ ok: false, error: "not-json" });
  });

  it("refuses a file that is too big, without reading it", () => {
    expect(parseBackup("{}", BACKUP_MAX_BYTES + 1)).toEqual({ ok: false, error: "too-big" });
  });

  it("refuses the wrong shape", () => {
    expect(parseBackup(JSON.stringify({ cvs: [] }))).toEqual({ ok: false, error: "wrong-shape" });
    expect(parseBackup(wrap([{ id: 1 }]))).toEqual({ ok: false, error: "wrong-shape" });
    expect(parseBackup("[]")).toEqual({ ok: false, error: "wrong-shape" });
  });

  it("refuses an empty backup", () => {
    expect(parseBackup(buildBackup([], new Date(NOW)))).toEqual({ ok: false, error: "empty" });
  });

  it("refuses script markup", () => {
    const bad = { ...cv, summary: "<script>alert(1)</script>" };
    expect(parseBackup(wrap([bad]))).toEqual({ ok: false, error: "has-script" });
  });

  it("drops unknown fields", () => {
    const parsed = parseBackup(wrap([{ ...cv, evil: "x" }]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect("evil" in (parsed.cvs[0] ?? {})).toBe(false);
  });

  it("clamps style values", () => {
    const parsed = parseBackup(wrap([{ ...cv, style: { ...cv.style, accent: "red; x" } }]));
    expect(parsed.ok && parsed.cvs[0]?.style.accent).not.toBe("red; x");
  });

  it("loads a version 1 CV from an older backup", () => {
    const old = withoutNewSections(cv);
    const parsed = parseBackup(wrap([{ ...old, schemaVersion: 1, sectionOrder: ["summary"] }]));
    expect(parsed.ok && parsed.cvs[0]?.certifications).toEqual([]);
  });
});
