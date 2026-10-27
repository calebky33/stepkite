#!/usr/bin/env node
// Claude Code PostToolUse hook for Edit and Write.
// 1. Formats the edited file with Prettier (run through node directly, so it works on Windows too).
// 2. Runs the copy check on user-facing files.
// Exit 2 sends the problem back to Claude to fix now. Exit 0 means there is nothing to report.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";

function fail(message) {
  process.stderr.write(message.endsWith("\n") ? message : `${message}\n`);
  process.exit(2);
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  let file;
  try {
    file = JSON.parse(input)?.tool_input?.file_path;
  } catch {
    process.exit(0); // Not a tool event we understand.
  }
  if (typeof file !== "string" || !file) process.exit(0);

  const root = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const abs = resolve(root, file);
  const rel = relative(root, abs);
  // Only act on files inside the project. The absolute path also means it can never be read as a CLI option.
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) process.exit(0);

  // Prettier is a dev dependency once the project is scaffolded; before that there is nothing to run.
  const prettier = join(root, "node_modules", "prettier", "bin", "prettier.cjs");
  if (existsSync(prettier)) {
    const fmt = spawnSync(process.execPath, [prettier, "--write", "--ignore-unknown", "--log-level", "warn", abs], {
      cwd: root,
      encoding: "utf8",
      timeout: 20000,
    });
    if (fmt.error || fmt.status !== 0) {
      fail(`Prettier could not format ${rel}. Fix the file so it parses.\n${fmt.stderr || fmt.error?.message || ""}`);
    }
  }

  if (!/^(app|components|content)[\\/]/.test(rel)) process.exit(0);
  const r = spawnSync(process.execPath, [join(root, "scripts", "check-copy.mjs"), abs], {
    cwd: root,
    encoding: "utf8",
    timeout: 20000,
  });
  if (r.status === 0) process.exit(0);
  if (r.status === 1) {
    fail(`${r.stderr}\nRewrite these lines per docs/VOICE.md and the humanizer skill before continuing.`);
  }
  fail(`The copy check did not run (${r.error?.message || `exit ${r.status}`}). Check scripts/check-copy.mjs.\n${r.stderr || ""}`);
});
