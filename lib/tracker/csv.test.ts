import { describe, expect, it } from "vitest";
import {
  CSV_MAX_BYTES,
  CSV_MAX_ROWS,
  exportCsv,
  importPreview,
  parseCsv,
  type CsvMapping,
} from "./csv";
import { DEFAULT_STAGES } from "./schema";
import { NOW, makeJob } from "./fixtures.test-util";

describe("parseCsv", () => {
  it("handles quotes, commas, newlines, CRLF and a BOM", () => {
    const text = '﻿a,b\r\n"x, y","say ""hi"""\r\n"line1\nline2",z\r\n';
    expect(parseCsv(text)).toEqual({
      ok: true,
      rows: [
        ["a", "b"],
        ["x, y", 'say "hi"'],
        ["line1\nline2", "z"],
      ],
    });
  });
  it("keeps a last row with no final newline and skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2")).toEqual({
      ok: true,
      rows: [
        ["a", "b"],
        ["1", "2"],
      ],
    });
  });
  it("keeps empty cells", () => {
    expect(parseCsv("a,,c")).toEqual({ ok: true, rows: [["a", "", "c"]] });
  });
  it("refuses an unclosed quote", () => {
    expect(parseCsv('a,"b')).toEqual({ ok: false, error: "bad-quotes" });
  });
  it("refuses over 5 MB and over 5000 data rows", () => {
    expect(parseCsv("a", CSV_MAX_BYTES + 1)).toEqual({ ok: false, error: "too-big" });
    const many = "h\n" + Array.from({ length: CSV_MAX_ROWS + 1 }, () => "x").join("\n");
    expect(parseCsv(many)).toEqual({ ok: false, error: "too-many-rows" });
    const fits = "h\n" + Array.from({ length: CSV_MAX_ROWS }, () => "x").join("\n");
    expect(parseCsv(fits).ok).toBe(true);
  });
});

describe("exportCsv", () => {
  it("writes a header, stage names and escapes cells", () => {
    const csv = exportCsv(
      [makeJob({ title: 'Dev, "Sr"', notes: "a\nb", tags: ["x", "y"] })],
      DEFAULT_STAGES,
    );
    const parsed = parseCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const [head = [], row = []] = parsed.rows;
    expect(row[head.indexOf("title")]).toBe('Dev, "Sr"');
    expect(row[head.indexOf("stage")]).toBe("Saved");
    expect(row[head.indexOf("notes")]).toBe("a\nb");
    expect(row[head.indexOf("tags")]).toBe("x;y");
  });
  it("prefixes risky cells with a single quote", () => {
    for (const bad of ["=SUM(A1)", "+1", "-1", "@cmd", "\tcmd", "\rcmd"]) {
      const csv = exportCsv([makeJob({ title: bad })], DEFAULT_STAGES);
      expect(csv).toContain("'" + bad);
    }
  });
  it("exports an empty list as a header only", () => {
    const parsed = parseCsv(exportCsv([], DEFAULT_STAGES));
    expect(parsed.ok && parsed.rows.length).toBe(1);
  });
  it("round trips through import, including a guarded cell", () => {
    const jobs = [makeJob({ title: "=evil", company: "Acme, Ltd", location: "Leeds" })];
    const parsed = parseCsv(exportCsv(jobs, DEFAULT_STAGES));
    if (!parsed.ok) throw new Error("parse failed");
    const [head = [], ...rows] = parsed.rows;
    const mapping: CsvMapping = Object.fromEntries(head.map((h, i) => [h, i]));
    const out = importPreview(rows, mapping, {
      stages: DEFAULT_STAGES,
      now: NOW,
      newId: (n) => `n${n}`,
    });
    expect(out.errors).toEqual([]);
    expect(out.jobs[0]?.title).toBe("=evil");
    expect(out.jobs[0]?.company).toBe("Acme, Ltd");
  });
});

describe("importPreview", () => {
  const ctx = { stages: DEFAULT_STAGES, now: NOW, newId: (n: number) => `new-${n}` };
  const mapping: CsvMapping = { title: 0, company: 1, stage: 2, url: 3 };
  it("builds jobs, matching stage names without case", () => {
    const out = importPreview([["Dev", "Acme", "applied", ""]], mapping, ctx);
    expect(out.errors).toEqual([]);
    expect(out.jobs[0]).toMatchObject({ id: "new-0", stageId: "stage-applied" });
  });
  it("falls back to Saved for an unknown stage", () => {
    const out = importPreview([["Dev", "Acme", "Zzz", ""]], mapping, ctx);
    expect(out.jobs[0]?.stageId).toBe("stage-saved");
  });
  it("reports per-row errors by row number without echoing cell text", () => {
    const out = importPreview(
      [
        ["Dev", "Acme", "", ""],
        ["", "Acme", "", ""],
        ["Dev", "Acme", "", "not a link"],
      ],
      mapping,
      ctx,
    );
    expect(out.jobs).toHaveLength(1);
    expect(out.errors.map((e) => e.row)).toEqual([2, 3]);
    expect(JSON.stringify(out.errors)).not.toContain("not a link");
  });
  it("reads tags split by semicolon", () => {
    const out = importPreview([["Dev", "Acme", "", "", "a; b"]], { ...mapping, tags: 4 }, ctx);
    expect(out.jobs[0]?.tags).toEqual(["a", "b"]);
  });
  it("handles short rows", () => {
    const out = importPreview([["Dev"]], mapping, ctx);
    expect(out.errors).toHaveLength(1);
  });
});
