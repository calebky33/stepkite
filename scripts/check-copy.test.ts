// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts", "check-copy.mjs");
const dirs: string[] = [];

function run(file: string, content: string) {
  const dir = mkdtempSync(join(tmpdir(), "copycheck-"));
  dirs.push(dir);
  writeFileSync(join(dir, file), content);
  return spawnSync(process.execPath, [SCRIPT, dir], { encoding: "utf8" });
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop() as string, { recursive: true, force: true });
});

describe("check:copy", () => {
  it("passes plain copy", () => {
    const result = run("a.tsx", `export const A = () => <p>You take home £1,946 a month.</p>;\n`);
    expect(result.status).toBe(0);
  });

  it("fails on a banned word", () => {
    expect(run("a.tsx", `export const A = () => <p>Unlock your pay.</p>;\n`).status).toBe(1);
  });

  it("fails on an em dash", () => {
    expect(run("a.tsx", `export const A = () => <p>Pay — after tax.</p>;\n`).status).toBe(1);
  });

  it("fails on an emoji", () => {
    expect(run("a.tsx", `export const A = () => <p>Saved 🚀</p>;\n`).status).toBe(1);
  });

  it("fails on a slash between words", () => {
    expect(run("a.tsx", `export const A = () => <p>Use and/or here.</p>;\n`).status).toBe(1);
  });

  it("does not treat a class list as prose", () => {
    const result = run(
      "a.tsx",
      `export const A = () => <div className="bg-black/50 md:w-1/2 flex" />;\n`,
    );
    expect(result.status).toBe(0);
  });

  it("allows a flagged line marked copy-ok", () => {
    const result = run("a.tsx", `export const A = () => <p>Unlock your pay.</p>; // copy-ok\n`);
    expect(result.status).toBe(0);
  });

  it("checks markdown too", () => {
    expect(run("guide.mdx", `Delve into your pay.\n`).status).toBe(1);
  });
});
