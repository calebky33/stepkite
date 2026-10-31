// Run with: node --test scripts/hooks/stop-check.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { changedSources, statusPaths } from "./stop-check.mjs";

test("parses porcelain -z output", () => {
  const out = [
    " M app/my page/page.tsx",
    "R  lib/new name.ts",
    "lib/old.txt",
    "?? components/New.tsx",
    " M notes.txt",
    "",
  ].join("\0");
  assert.deepEqual(statusPaths(out), [
    "app/my page/page.tsx",
    "lib/new name.ts",
    "components/New.tsx",
    "notes.txt",
  ]);
  assert.deepEqual(changedSources(out), [
    "app/my page/page.tsx",
    "lib/new name.ts",
    "components/New.tsx",
  ]);
});

test("empty output has no changes", () => {
  assert.deepEqual(changedSources(""), []);
});
