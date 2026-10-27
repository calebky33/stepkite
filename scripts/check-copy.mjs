#!/usr/bin/env node
// Fails (exit 1) if user-facing text has AI-sounding phrases, emoji, dashes, or slashes (docs/VOICE.md).
// Usage: node scripts/check-copy.mjs [path ...]   (default: app components content)
// Add `// copy-ok` on a line to allow a deliberate use.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ARGS = process.argv.slice(2);
const DIRS = ARGS.length ? ARGS : ["app", "components", "content"];
const EXT = new Set([".tsx", ".ts", ".jsx", ".mdx", ".md", ".json"]);
const SKIP = /node_modules|\.next|\.test\.|\.spec\.|__tests__/;

const BANNED = [
  "delve", "elevate", "unlock", "unleash", "empower", "seamless", "leverage", "robust",
  "cutting-edge", "game-changer", "game changer", "revolutioni[sz]e", "supercharge", "harness",
  "embark", "tapestry", "realm", "in today's fast-paced", "look no further", "it's important to note",
  "rest assured", "we've got you covered", "next level", "stand out from the crowd", "dream job",
  "crafted with care", "effortless", "all-in-one", "next-gen", "ai-powered", "oops",
  "something went wrong", "hang tight", "join thousands", "it's not just", "24/7",
].map((w) => new RegExp(`\\b${w}`, "i"));
// Any pictographic emoji, except the legal marks (c) (r) (tm).
const EMOJI = /(?![©®™])\p{Extended_Pictographic}/u;
const DASH = /[—–]|\s-\s/;
// A slash with a letter on at least one side (and/or, month/week). Digit/digit is a date or fraction, so it passes.
const SLASH = /[A-Za-z)]\s*\/\s*[A-Za-z0-9(]|[A-Za-z0-9)]\s*\/\s*[A-Za-z(]/;

// Words that appear in sentences but never in a list of CSS classes.
const STOPWORDS = new Set(["a", "an", "and", "or", "the", "to", "of", "for", "in", "on", "with", "your", "you", "per", "is", "are", "it", "this", "that", "not", "no", "yes", "by", "at", "from"]);

// "bg-black/50 md:w-1/2 flex" is a class list, not prose.
function isClassLike(s) {
  const tokens = s.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || !tokens.every((t) => /^[\w:\-/[\].%#!]+$/.test(t))) return false;
  if (tokens.some((t) => STOPWORDS.has(t.toLowerCase()))) return false;
  return tokens.filter((t) => /[-:/[]/.test(t)).length * 2 >= tokens.length;
}

// Remove template expressions, URLs and route paths, which are not prose.
const clean = (s) =>
  s
    .replace(/\$\{[^}]*\}/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(^|\s)\/[\w\-/[\]]+/g, " ");

function codeParts(line, ext) {
  const t = line.trim();
  if (/^(\/\/|\/\*|\*)/.test(t)) return []; // comment lines
  if (/^import\b/.test(t) || /^export\b.*\bfrom\b/.test(t) || /\brequire\(/.test(t)) return []; // module paths
  if (/\b(cn|clsx|cva|twMerge|classNames)\(/.test(t)) return [];
  // JSX text that Prettier wrapped onto its own line: words, no code punctuation.
  if ((ext === ".tsx" || ext === ".jsx") && /[A-Za-z]\s+[A-Za-z]/.test(t) && !/[=;{}()<>"`]/.test(t)) {
    return [clean(t)].filter((s) => !isClassLike(s));
  }
  const stripped = line.replace(/\b(className|class)=(\{?)(["'`])(?:\\.|(?!\3).)*\3\}?/g, "");
  const parts = [];
  for (const m of stripped.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)) if (m[2].includes(" ")) parts.push(m[2]);
  for (const m of stripped.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)) parts.push(m[1]);
  return parts.map(clean).filter((s) => !isClassLike(s));
}

function mdParts(line, state) {
  if (/^\s*(```|~~~)/.test(line)) {
    state.fence = !state.fence;
    return [];
  }
  if (state.fence) return [];
  if (/^\s*(import|export|<|\||#{1,6}\s*$)/.test(line)) return [];
  const body = line.replace(/^\s*([-*+]|\d+[.)])\s+/, "").replace(/\]\([^)]*\)/g, "]");
  return [clean(body)];
}

const hits = [];
function walk(p, explicit) {
  if (!existsSync(p)) {
    if (explicit) hits.push(`${p}  path does not exist`);
    return;
  }
  if (SKIP.test(relative(process.cwd(), p))) return;
  if (statSync(p).isDirectory()) return readdirSync(p).forEach((f) => walk(join(p, f), false));
  const ext = extname(p);
  if (!EXT.has(ext)) return;
  const md = ext === ".md" || ext === ".mdx";
  const state = { fence: false };
  readFileSync(p, "utf8")
    .split(/\r?\n/)
    .forEach((raw, i) => {
      if (raw.includes("copy-ok")) return;
      const line = raw.replace(/[‘’]/g, "'");
      const prose = md ? mdParts(line, state) : codeParts(line, ext);
      const at = `${p}:${i + 1}`;
      const show = line.trim().slice(0, 90);
      const text = prose.join("\n");
      const bad = BANNED.find((r) => r.test(text));
      if (bad) hits.push(`${at}  "${text.match(bad)[0]}"  ${show}`);
      else if (!/^\s*(\/\/|\/\*|\*)/.test(line) && EMOJI.test(line)) hits.push(`${at}  emoji  ${show}`);
      else if (prose.some((s) => DASH.test(s))) hits.push(`${at}  dash  ${show}`);
      else if (prose.some((s) => SLASH.test(s))) hits.push(`${at}  slash  ${show}`);
    });
}
DIRS.forEach((d) => walk(d, ARGS.length > 0));

if (hits.length) {
  console.error(`check:copy found ${hits.length} issue(s). See docs/VOICE.md.\n` + hits.join("\n"));
  process.exit(1);
}
console.log("check:copy passed");
