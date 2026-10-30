import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SKIP = new Set(["node_modules", ".next", ".open-next", "e2e", "test-results", ".git"]);

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (/\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\./.test(name)) out.push(path);
  }
  return out;
}

const rel = (path: string) => relative(ROOT, path).split(sep).join("/");

describe("heavy parsers load only on demand", () => {
  const files = ["app", "components", "lib"].flatMap((d) => sources(join(ROOT, d)));
  const mentions = files.filter((f) => /pdfjs-dist|mammoth/.test(readFileSync(f, "utf8")));

  it("is mentioned by one source file only", () => {
    expect(mentions.map(rel).filter((f) => !f.endsWith(".d.ts"))).toEqual([
      "lib/cv/import/extract.ts",
    ]);
  });

  it("is never imported statically or required", () => {
    for (const file of mentions) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/from\s+["'](pdfjs-dist|mammoth)/);
      expect(source).not.toMatch(/^\s*import\s+["'](pdfjs-dist|mammoth)/m);
      expect(source).not.toMatch(/require\(\s*["'](pdfjs-dist|mammoth)/);
    }
  });

  it("is reached only through import() inside extract.ts", () => {
    const source = readFileSync(join(ROOT, "lib/cv/import/extract.ts"), "utf8");
    expect(source).toMatch(/await import\("pdfjs-dist\/legacy\/build\/pdf\.mjs"\)/);
    expect(source).toMatch(/await import\("pdfjs-dist\/legacy\/build\/pdf\.worker\.mjs"\)/);
    expect(source).toMatch(/await import\("mammoth"\)/);
  });

  it("is imported by no shared module: only the CV import screen reaches extract.ts", () => {
    const importers = files
      .filter((f) => /import\/extract["']/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(importers).toEqual(["components/tools/cv/CvImportScreen.tsx"]);
  });
});
