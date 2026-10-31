#!/usr/bin/env node
// Claude Code PreToolUse hook. A best-effort guardrail against accidents, NOT a security boundary.
// A determined caller can always build a command this file does not recognise. The real control is
// a narrowly scoped Cloudflare API token (see docs/DEPLOY.md), so the session cannot do more than
// the owner intends. What this hook blocks:
// 1. `next build` while the dev server holds port 3000 (it corrupts .next).
// 2. `shadcn add` or `init` aimed at components/ui (it overwrote our primitives).
// 3. Reading env files or dumping the environment by any route the permission rules do not cover
//    (CLAUDE.md rule 11). `.env.example` style files are allowed.
// 4. Direct deploys, deploys without a fresh preflight, and a 100% rollout that was not smoked.
// 5. Commits whose diff holds something shaped like a secret.
// 6. Writing the preflight or smoke markers by hand.
// Prints a deny decision and exits 0. Anything it does not understand is allowed.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { connect } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd());

// Known-public values (for example a Supabase anon key) that trip a secret shape. Add the exact
// string here instead of loosening a regex. Empty on purpose.
export const ALLOW_LIST = [
  // "eyJ...public anon key...",
];

const SECRET_FILE = /(^|[\\/])\.(env(\.[^\\/\s]*)?|dev\.vars(\.[^\\/\s]*)?)$/i;
const SAFE_FILE = /\.(example|sample|template)$/i;
const FILE_TOOLS = new Set(["Read", "Edit", "Write", "MultiEdit", "NotebookEdit", "Glob", "Grep"]);
const WRITE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const MARKER = /(^|[\\/])\.claude[\\/]\.(preflight-ok|smoke-ok)$/i;

class Denied extends Error {}

function deny(reason) {
  throw new Denied(reason);
}

function isSecretPath(value) {
  return (
    typeof value === "string" && SECRET_FILE.test(value.trim()) && !SAFE_FILE.test(value.trim())
  );
}

function probe(host, port) {
  return new Promise((done) => {
    const socket = connect({ port, host });
    const finish = (result) => {
      socket.destroy();
      done(result);
    };
    socket.setTimeout(500, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function portInUse(port) {
  const results = await Promise.all([probe("127.0.0.1", port), probe("::1", port)]);
  return results.some(Boolean);
}

/** Lowercase, quotes removed, backslashes to slashes, wrangler launcher names unified. */
export function normalise(command) {
  return command
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .replace(/\bwrangler\.(cmd|js|exe|ps1|mjs)\b/g, "wrangler")
    .trim();
}

function envChecks(command) {
  const dump =
    /\bprintenv\b/i.test(command) ||
    /\b(gci|dir|ls|get-childitem|get-item|gi)\s+(-\S+\s+)*env:/i.test(command) ||
    /(^|[;&|(]\s*)env\s*($|[;&|)])/.test(command) ||
    /(^|[;&|(]\s*)(export|set)\s*($|[;&|)])/.test(command) ||
    /\bdeclare\s+-[a-z]*p/i.test(command) ||
    /\/proc\/[^\s]*\/environ/i.test(command);
  if (dump) {
    deny(
      "Dumping the environment can print secrets (CLAUDE.md rule 11). Read the one variable you need by name in code, not the whole list.",
    );
  }
  const deniedMessage =
    "That command touches an env or .dev.vars file. Secrets are never read, printed or copied (CLAUDE.md rule 11). Ask the owner to change it.";
  const named = /(^|[\s"'=<>/\\])\.(env(\.[\w.-]*)?|dev\.vars(\.[\w.-]*)?)(?=$|[\s"';|&<>)])/gi;
  for (const match of command.matchAll(named)) {
    const whole = match[0].trim().replace(/^[=<>"'/\\]+/, "");
    if (!SAFE_FILE.test(whole)) deny(deniedMessage);
  }
  // Globs that resolve to .env or .dev.vars: .e*, .en?, .env*, .d*
  if (/(^|[\s"'=<>/\\])\.(e|en|env|d|de|dev)[*?[]/i.test(command)) deny(deniedMessage);
}

function packageScripts() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    return pkg && typeof pkg.scripts === "object" && pkg.scripts ? pkg.scripts : {};
  } catch {
    return {};
  }
}

const WR = "wrangler(?:@[\\w.-]+)?";
const DEPLOY_MESSAGE =
  "No direct deploy. Upload a version (wrangler versions upload, or opennextjs-cloudflare upload), run node scripts/smoke.mjs on it, then promote with wrangler versions deploy in steps (10%, 50%, 100%). Roll back with wrangler rollback. See docs/DEPLOY.md.";

// Zero downtime: nothing reaches production in one step, and nothing ships without a fresh preflight.
export function checkDeploy(raw) {
  const n = normalise(raw);
  const touches = /(wrangler|opennextjs-cloudflare|deploy|\b(pnpm|npm|yarn)\b)/.test(n);
  if (!touches) return;
  if (
    new RegExp(
      `\\b${WR} (?:[^;&|]* )?(delete|secret (delete|bulk|put)|(kv|r2|d1|queues|vectorize)\\b[^;&|]*\\b(delete|drop))\\b`,
    ).test(n) ||
    new RegExp(
      `\\b${WR} (?:[^;&|]* )?d1 execute\\b[^;&|]*--remote[^;&|]*\\b(drop|delete|truncate)\\b`,
    ).test(n)
  ) {
    deny(
      "That deletes or changes production data or secrets. The owner runs it, after a backup. Secrets are never typed by Claude (CLAUDE.md rule 11).",
    );
  }
  // wrangler [flags] deploy, but not `wrangler versions deploy`.
  if (new RegExp(`\\b${WR} (?:[^;&|]* )?(?<!versions )deploy\\b`).test(n)) deny(DEPLOY_MESSAGE);
  if (/\bopennextjs-cloudflare(?:@[\w.-]+)? (?:[^;&|]* )?deploy\b/.test(n)) deny(DEPLOY_MESSAGE);
  // Package script aliases.
  if (/\b(pnpm|npm|yarn)( run| run-script)? deploy\b/.test(n)) deny(DEPLOY_MESSAGE);
  for (const [name, body] of Object.entries(packageScripts())) {
    const b = normalise(String(body));
    const bad =
      new RegExp(`\\b${WR} (?:[^;&|]* )?(?<!versions )deploy\\b`).test(b) ||
      /\bopennextjs-cloudflare(?:@[\w.-]+)? (?:[^;&|]* )?deploy\b/.test(b);
    if (!bad) continue;
    const safeName = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b(pnpm|npm|yarn)( run| run-script| exec)? ${safeName}\\b`).test(n)) {
      deny(DEPLOY_MESSAGE);
    }
  }
  // Best effort: a variable named like wrangler followed by deploy (W=wrangler; $W deploy).
  if (
    (/\b\w*(wrangler|opennext)\w*=|=\S*(wrangler|opennext)/.test(n) && /\bdeploy\b/.test(n)) ||
    /\$\{?\w*(wrangler|opennext)\w*\}?[^;&|]*\bdeploy\b/.test(n)
  ) {
    deny(DEPLOY_MESSAGE);
  }

  const versionsDeploy = new RegExp(`\\b${WR} (?:[^;&|]* )?versions (?:[^;&|]* )?deploy\\b`).test(
    n,
  );
  const ships =
    versionsDeploy ||
    new RegExp(`\\b${WR} (?:[^;&|]* )?versions (?:[^;&|]* )?upload\\b`).test(n) ||
    /\bopennextjs-cloudflare(?:@[\w.-]+)? (?:[^;&|]* )?upload\b/.test(n);
  if (!ships) return;
  const head = git(["rev-parse", "HEAD"]);
  if (!head.ok || !markerFresh(".preflight-ok", 60, head.out)) {
    deny(
      "Preflight has not passed for this commit in the last hour. Run node scripts/preflight.mjs (typecheck, lint, copy check, tests, build) and commit first.",
    );
  }
  if (!versionsDeploy) return;
  const hasPercent = /@\s*\d|--percentage/.test(n);
  const full =
    /@\s*100(\.0+)?\s*%?(?!\d)/.test(n) ||
    /--percentage[ =]100(\.0+)?(?!\d)/.test(n) ||
    /(^|\s)100%/.test(n) ||
    !hasPercent;
  if (!full) return;
  const smoke = readMarker(".smoke-ok", 30);
  if (!smoke || typeof smoke.version !== "string" || smoke.version.length < 8) {
    deny(
      "Going to 100% needs a passing smoke check on the new version in the last 30 minutes, with a version id. Run node scripts/smoke.mjs <url> first, and move traffic in steps.",
    );
  }
  if (!n.includes(smoke.version.toLowerCase())) {
    deny(
      `The 100% command must name the version that passed smoke (${smoke.version}). Use that id in wrangler versions deploy.`,
    );
  }
}

// Security: no secret reaches a commit. Scans the staged diff for key shapes and env files.
const SECRET_SHAPES = [
  /sk_(live|test)_[0-9a-zA-Z]{16,}/,
  /rk_(live|test)_[0-9a-zA-Z]{16,}/,
  /whsec_[0-9a-zA-Z]{16,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  /SERVICE_ROLE[A-Z_]*\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/i,
  /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][A-Za-z0-9_\-+/=]{24,}["']/i,
];

const GIT_FAILED =
  "Git could not be read, so the diff was not scanned for secrets. Fix git first (is this a repository, is the diff huge?) and try again.";

export function checkCommit(raw) {
  const n = raw.toLowerCase();
  if (!/\bgit\b[^|;&\n]*\b(commit|commit-tree)\b/.test(n)) return;
  const after = n
    .split(/\bcommit(?:-tree)?\b/)
    .slice(1)
    .join(" ");
  const tokens = after.split(/\s+/).filter(Boolean);
  let wide = false;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^(-m|-f|-c|-C|--message|--file|--author|--date)$/i.test(t)) {
      i++;
      continue;
    }
    if (t === "--all" || t === "--only" || t === "--include" || t === "--") wide = true;
    else if (/^-[a-z]*[aoi][a-z]*$/.test(t) && !t.startsWith("--")) wide = true;
    else if (!t.startsWith("-") && /[./\\]/.test(t) && !/^["']/.test(t)) wide = true;
  }
  const staged = git(["diff", "--cached", "--name-only"]);
  if (!staged.ok) deny(GIT_FAILED);
  const names = staged.out.split("\n").filter(Boolean);
  const envFile = names.find((name) => isSecretPath(name));
  if (envFile) {
    deny(
      `An env or .dev.vars file is staged (${envFile}). Unstage it with git restore --staged. Secrets are never committed.`,
    );
  }
  const diffs = [git(["diff", "--cached", "-U0"])];
  if (wide) {
    const hasHead = git(["rev-parse", "--verify", "HEAD"]).ok;
    const tree = git(hasHead ? ["diff", "HEAD", "--name-only"] : ["diff", "--name-only"]);
    if (!tree.ok) deny(GIT_FAILED);
    const workEnv = tree.out.split("\n").find((name) => isSecretPath(name));
    if (workEnv)
      deny(
        `An env or .dev.vars file would be committed (${workEnv}). Secrets are never committed.`,
      );
    diffs.push(git(hasHead ? ["diff", "HEAD", "-U0"] : ["diff", "-U0"]));
  }
  for (const d of diffs) {
    if (!d.ok) deny(GIT_FAILED);
    const hit = d.out
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
      .filter((l) => !ALLOW_LIST.some((ok) => ok && l.includes(ok)))
      .find((l) => SECRET_SHAPES.some((re) => re.test(l)));
    if (hit) {
      deny(
        "The changes contain something shaped like a secret (a key, token, private key or service role value). Remove it or load it from the environment, then stage again. The value is not shown here.",
      );
    }
  }
}

function git(args) {
  const r = spawnSync("git", args, {
    encoding: "utf8",
    timeout: 10000,
    cwd: ROOT,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.error || r.status !== 0) return { ok: false, out: "" };
  return { ok: true, out: r.stdout.trim() };
}

function readMarker(name, minutes) {
  try {
    const m = JSON.parse(readFileSync(join(ROOT, ".claude", name), "utf8"));
    const age = Date.now() - Date.parse(m.at);
    return Number.isFinite(age) && age >= 0 && age < minutes * 60_000 ? m : null;
  } catch {
    return null;
  }
}

function markerFresh(name, minutes, sha) {
  const m = readMarker(name, minutes);
  return m !== null && (sha === null || m.commit === sha);
}

export async function checkBash(command) {
  try {
    if (/\.(preflight-ok|smoke-ok)\b/i.test(command)) {
      deny(
        "The preflight and smoke markers are written only by scripts/preflight.mjs and scripts/smoke.mjs. Run those scripts instead.",
      );
    }
    envChecks(command);
    if (
      /\bshadcn(@[\w.-]+)?\s+(add|init)\b/i.test(command) &&
      /components[\\/]ui\b/i.test(command)
    ) {
      deny(
        "Never run shadcn into components/ui: it overwrites our Button, Card, Input, Slider, Switch and Tabs. shadcn copies live in components/shadcn.",
      );
    }
    if (/\bshadcn(@[\w.-]+)?\s+add\b/i.test(command) && /--overwrite|\s-o(\s|$)/.test(command)) {
      deny(
        "shadcn add --overwrite replaces existing components. Add into components/shadcn without overwrite.",
      );
    }
    if (
      /\b(pnpm|npm|yarn)(\s+run)?\s+build\b/.test(command) ||
      /\bnext\s+build\b/.test(command) ||
      /\bopennextjs-cloudflare\s+(build|deploy|preview|upload)\b/.test(command)
    ) {
      if (await portInUse(3000)) {
        deny(
          "The dev server is running on port 3000, and a production build corrupts .next. Stop pnpm dev first, then build.",
        );
      }
    }
    checkDeploy(command);
    checkCommit(command);
  } catch (error) {
    if (error instanceof Denied) throw error;
    // Unexpected failure: deny where the cost of a miss is high, allow otherwise.
    if (/wrangler|opennextjs|deploy|\bgit\b|\.env|\.dev\.vars|printenv/i.test(command)) {
      deny(
        "The safety check failed on this command, so it was not allowed. Rephrase it or ask the owner.",
      );
    }
  }
}

export async function decide(event) {
  const tool = event?.tool_name;
  const args = event?.tool_input ?? {};
  try {
    if (tool === "Bash" && typeof args.command === "string") {
      await checkBash(args.command);
    } else if (FILE_TOOLS.has(tool)) {
      const candidates = [args.file_path, args.path, args.notebook_path, args.glob, args.pattern];
      if (candidates.some(isSecretPath)) {
        deny(
          "Env and .dev.vars files hold secrets and are never read or edited (CLAUDE.md rule 11).",
        );
      }
      if (
        WRITE_TOOLS.has(tool) &&
        candidates.some((c) => typeof c === "string" && MARKER.test(c.trim()))
      ) {
        deny("The preflight and smoke markers are written only by their scripts, never by hand.");
      }
    }
  } catch (error) {
    if (error instanceof Denied) return error.message;
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let input = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (input += c));
  process.stdin.on("end", async () => {
    let event;
    try {
      event = JSON.parse(input);
    } catch {
      return;
    }
    const reason = await decide(event);
    if (reason === null) return;
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: reason,
        },
      }) + "\n",
    );
  });
}
