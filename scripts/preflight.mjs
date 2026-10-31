#!/usr/bin/env node
// Release gate. Runs every check that must be green before a version is uploaded, then writes
// .claude/.preflight-ok with the commit it covers. scripts/hooks/guard.mjs refuses to upload or
// deploy a version without a fresh marker for the current commit.
// Usage: node scripts/preflight.mjs [--skip-audit]
// --skip-audit skips the network audit (for example when offline). The marker still records it.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { connect } from "node:net";
import { join, resolve } from "node:path";

const root = resolve(process.cwd());

function probe(host, port) {
  return new Promise((done) => {
    const s = connect({ port, host });
    s.setTimeout(500, () => (s.destroy(), done(false)));
    s.once("connect", () => (s.destroy(), done(true)));
    s.once("error", () => done(false));
  });
}

async function portInUse(port) {
  return (await Promise.all([probe("127.0.0.1", port), probe("::1", port)])).some(Boolean);
}

function out(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status === 0 ? r.stdout.trim() : "";
}

if (await portInUse(3000)) {
  console.error("Stop the dev server on port 3000 first. A build while it runs corrupts .next.");
  process.exit(1);
}
const head = out("git", ["rev-parse", "HEAD"]);
if (out("git", ["status", "--porcelain"])) {
  console.error(
    "The working tree has uncommitted changes. Commit first so the marker covers what ships.",
  );
  process.exit(1);
}

const skipAudit = process.argv.includes("--skip-audit");
const steps = [
  ["typecheck", ["typecheck"]],
  ["lint", ["lint"]],
  ["copy check", ["check:copy"]],
  ["unit tests", ["test"]],
  ...(skipAudit
    ? []
    : [["audit (high and critical)", ["audit", "--prod", "--audit-level", "high"]]]),
  ["build", ["build"]],
];
for (const [label, args] of steps) {
  console.log(`preflight: ${label}`);
  const r = spawnSync("pnpm", args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) {
    if (label.startsWith("audit")) {
      console.error(
        "The audit needs the network and failed. If you are offline, rerun with --skip-audit and run the audit before the next deploy.",
      );
    }
    console.error(`preflight failed at: ${label}. Nothing was marked ready.`);
    process.exit(1);
  }
}

const commit = out("git", ["rev-parse", "HEAD"]);
if (!commit || commit !== head || out("git", ["status", "--porcelain"])) {
  console.error(
    "HEAD moved or the working tree changed during preflight. Nothing was marked ready. Commit, then run it again.",
  );
  process.exit(1);
}
mkdirSync(join(root, ".claude"), { recursive: true });
writeFileSync(
  join(root, ".claude", ".preflight-ok"),
  JSON.stringify({ commit, at: new Date().toISOString(), auditSkipped: skipAudit }),
);
console.log(`preflight passed for ${commit.slice(0, 7)}. Valid for 60 minutes.`);
