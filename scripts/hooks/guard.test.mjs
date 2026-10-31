// Run with: node --test scripts/hooks/guard.test.mjs
// Dangerous command text is built from parts here so this file is never a command line itself.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const GUARD = join(import.meta.dirname, "guard.mjs");
const W = "wrang" + "ler";
const OC = "opennextjs-" + "cloudflare";
const VERSION = "0a1b2c3d-1111-2222-3333-444455556666";

function git(cwd, ...args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

function makeProject({ marker = true, smoke = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "guard-"));
  git(dir, "init", "-q");
  git(dir, "config", "user.email", "t@example.com");
  git(dir, "config", "user.name", "t");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      scripts: {
        deploy: `${OC} build && ${OC} deploy`,
        ship: `${W} deploy`,
        test: "vitest run",
      },
    }),
  );
  writeFileSync(join(dir, "a.txt"), "a\n");
  git(dir, "add", ".");
  git(dir, "commit", "-qm", "init");
  const head = git(dir, "rev-parse", "HEAD");
  mkdirSync(join(dir, ".claude"));
  const now = new Date().toISOString();
  if (marker)
    writeFileSync(join(dir, ".claude", ".preflight-ok"), JSON.stringify({ commit: head, at: now }));
  if (smoke)
    writeFileSync(
      join(dir, ".claude", ".smoke-ok"),
      JSON.stringify({ at: now, origin: "https://x.example", version: VERSION }),
    );
  return dir;
}

function run(dir, tool_name, tool_input) {
  const r = spawnSync("node", [GUARD], {
    input: JSON.stringify({ tool_name, tool_input }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  assert.equal(r.status, 0);
  return r.stdout.includes('"permissionDecision":"deny"') ? "deny" : "allow";
}
const bash = (dir, command) => run(dir, "Bash", { command });

test("deploy gate denies direct deploys in many spellings", () => {
  const dir = makeProject();
  const cmds = [
    `${W} deploy`,
    `npx ${W}@latest deploy`,
    `pnpm dlx ${W}@4 deploy`,
    `${W} -e prod deploy`,
    `${W} --config x.jsonc deploy`,
    `node_modules\\.bin\\${W}.cmd deploy`,
    `"${W}"  deploy`,
    `${W.toUpperCase()} DEPLOY`,
    `${OC} deploy`,
    "pnpm deploy",
    "pnpm run deploy",
    "npm run deploy",
    "yarn deploy",
    "pnpm run ship",
    `W=${W}; $W deploy`,
  ];
  for (const c of cmds) assert.equal(bash(dir, c), "deny", c);
});

test("version upload needs a fresh preflight for this commit", () => {
  const ok = makeProject();
  assert.equal(bash(ok, `${W} versions upload`), "allow");
  const none = makeProject({ marker: false });
  assert.equal(bash(none, `${W} versions upload`), "deny");
});

test("100 percent needs the smoked version id", () => {
  const dir = makeProject();
  const partial = `${W} versions deploy ${VERSION}@10 other@90`;
  assert.equal(bash(dir, partial), "allow");
  for (const tail of ["@100", "@ 100%", "@100%", "--percentage 100", ""]) {
    assert.equal(bash(dir, `${W} versions deploy other-id${tail ? " " : ""}${tail}`), "deny", tail);
  }
  assert.equal(bash(dir, `${W} versions deploy ${VERSION}@100`), "allow");
  assert.equal(bash(dir, `${W} versions deploy ${VERSION} --percentage 100`), "allow");
  const nosmoke = makeProject({ smoke: false });
  assert.equal(bash(nosmoke, `${W} versions deploy ${VERSION}@100`), "deny");
});

test("env checks look at every file and dump route", () => {
  const dir = makeProject();
  const e = "." + "env";
  const cmds = [
    `cat ${e}.example ${e}`,
    `cat ${e}`,
    "cat .e*",
    "cat .en?",
    "cat .env*",
    "export",
    "declare -p",
    "set",
    "cat /proc/self/environ",
    "Get-Item Env:",
    "printenv",
  ];
  for (const c of cmds) assert.equal(bash(dir, c), "deny", c);
  assert.equal(bash(dir, `cat ${e}.example`), "allow");
  assert.equal(bash(dir, "set -e"), "allow");
});

test("commit scan sees flags before commit, -a and git failures", () => {
  const dir = makeProject();
  const secret = "sk_" + "live_" + "A1b2C3d4E5f6G7h8I9j0K1l2";
  writeFileSync(join(dir, "a.txt"), `a\nkey ${secret}\n`);
  // Unstaged change: only a wide commit sees it.
  assert.equal(bash(dir, "git commit -m x"), "allow");
  for (const c of [
    "git commit -am x",
    "git commit -a -m x",
    "git commit --all -m x",
    "git -c k=v commit -am x",
    "git --no-pager commit -a -m x",
    "git -C . commit -am x",
    "git commit -m x a.txt",
  ]) {
    assert.equal(bash(dir, c), "deny", c);
  }
  git(dir, "add", "a.txt");
  assert.equal(bash(dir, "git commit -m x"), "deny");
  assert.equal(bash(dir, "git commit-tree abc"), "deny");
  // Git itself failing is a deny, not a pass.
  const notRepo = mkdtempSync(join(tmpdir(), "guard-nogit-"));
  assert.equal(bash(notRepo, "git commit -m x"), "deny");
});

test("markers cannot be forged by file tools or the shell", () => {
  const dir = makeProject();
  for (const tool of ["Write", "Edit", "MultiEdit"]) {
    assert.equal(run(dir, tool, { file_path: join(dir, ".claude", ".smoke-ok") }), "deny");
    assert.equal(run(dir, tool, { file_path: ".claude/.preflight-ok" }), "deny");
  }
  assert.equal(run(dir, "Write", { file_path: join(dir, "x.txt") }), "allow");
  assert.equal(bash(dir, "echo {} > .claude/.smoke-ok"), "deny");
});

test("ordinary commands pass", () => {
  const dir = makeProject();
  for (const c of ["pnpm test lib/tax/uk", "git status", "ls -la", "pnpm typecheck"])
    assert.equal(bash(dir, c), "allow", c);
});
