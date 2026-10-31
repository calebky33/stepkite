/** Pure helpers for the "paste a link" job preview. Uses fetch only, so it runs on Workers. */

export type PreviewReason =
  | "invalid"
  | "blocked"
  | "not-html"
  | "too-large"
  | "timeout"
  | "no-details"
  | "fetch-failed"
  | "not-found"
  | "blocked-by-site"
  | "read-failed";

export type TitleSource = "jsonld" | "og" | "title";

export type PreviewResult =
  | { ok: true; title?: string; company?: string; titleSource?: TitleSource }
  | { ok: false; reason: PreviewReason };

/** Lowercases A to Z only, so string length and indices never change. */
export function asciiLower(s: string): string {
  return s.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32));
}

export const MAX_URL_LENGTH = 2000;
export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_HOPS = 3;
export const TIMEOUT_MS = 5000;
export const FIELD_CAP = 160;
export const USER_AGENT = "StepkiteJobPreview/1.0";

const BLOCKED_SUFFIXES = [
  ".local",
  ".internal",
  ".localhost",
  ".lan",
  ".home",
  ".corp",
  ".intranet",
  ".private",
  ".localdomain",
  ".home.arpa",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
  ".localtest.me",
  ".lvh.me",
  ".test",
  ".example",
  ".invalid",
  ".traefik.me",
  ".vcap.me",
  ".lacolhost.com",
  ".1u.ms",
  ".workers.dev",
];

/**
 * True when the hostname must never be fetched. This check is name based.
 * DNS names that resolve to private ranges are only safe because Workers fetch cannot reach
 * RFC1918 or loopback addresses. Never add VPC or Tunnel bindings to this Worker.
 */
export function isBlockedHost(hostname: string, selfHost?: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (!h) return true;
  const self = selfHost?.toLowerCase().replace(/\.$/, "");
  if (self && (h === self || h.endsWith("." + self))) return true;
  if (h.includes(":") || h.startsWith("[")) return true; // IPv6 literal
  if (h === "localhost") return true;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (!h.includes(".")) return true; // single label, internal names
  if (!/^[a-z0-9.-]+$/.test(h)) return true; // punycode only, no odd characters
  const labels = h.split(".");
  const last = labels[labels.length - 1] ?? "";
  if (/^\d+$/.test(last) || /^0x/i.test(last)) return true; // IPv4 in any notation
  if (labels.some((l) => l === "")) return true;
  return false;
}

/** Validates a user supplied or redirect URL. Returns the parsed URL or null. */
export function parseSafeUrl(raw: string, base?: string, selfHost?: string): URL | null {
  if (raw.length > MAX_URL_LENGTH) return null;
  let u: URL;
  try {
    u = base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.username || u.password) return null;
  if (u.port) return null; // URL drops the default 443, so any port here is non-standard
  if (isBlockedHost(u.hostname, selfHost)) return null;
  return u;
}

const NAMED = new Map<string, string>(Object.entries({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  hellip: "...",
}));

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code =
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (
        !Number.isFinite(code) ||
        code < 32 ||
        code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)
      )
        return " ";
      return String.fromCodePoint(code);
    }
    return NAMED.get(asciiLower(e)) ?? m;
  });
}

/** Decode, strip control characters, collapse whitespace, trim, cap. */
export function cleanText(s: string): string | undefined {
  const t = Array.from(decodeEntities(s), (c) => {
    const n = c.codePointAt(0) ?? 0;
    return n < 32 || n === 127 ? " " : c;
  })
    .join("")
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return undefined;
  const points = Array.from(t);
  return points.length > FIELD_CAP ? points.slice(0, FIELD_CAP).join("").trimEnd() : t;
}

const HEAD_SCAN_BYTES = 128 * 1024;
const MAX_META = 200;
const MAX_SCRIPTS = 20;
const MAX_ATTR_NAME = 40;

const isSpace = (c: string) => c === " " || c === "\n" || c === "\t" || c === "\r" || c === "\f";

/** Linear attribute parser. Always advances. Names over 40 characters are skipped. */
function parseAttrs(tag: string): Record<string, string | undefined> {
  const attrs: Record<string, string | undefined> = Object.create(null) as Record<
    string,
    string | undefined
  >;
  let i = 0;
  const n = tag.length;
  while (i < n) {
    while (i < n && (isSpace(tag[i] ?? "") || tag[i] === "/")) i++;
    const start = i;
    while (i < n && !isSpace(tag[i] ?? "") && tag[i] !== "=" && tag[i] !== "/") i++;
    const name = tag.slice(start, i);
    while (i < n && isSpace(tag[i] ?? "")) i++;
    if (tag[i] !== "=") {
      if (i === start) i++;
      continue;
    }
    i++;
    while (i < n && isSpace(tag[i] ?? "")) i++;
    let value = "";
    const q = tag[i];
    if (q === '"' || q === "'") {
      const end = tag.indexOf(q, i + 1);
      value = tag.slice(i + 1, end === -1 ? n : end);
      i = end === -1 ? n : end + 1;
    } else {
      const vs = i;
      while (i < n && !isSpace(tag[i] ?? "")) i++;
      value = tag.slice(vs, i);
    }
    if (name && name.length <= MAX_ATTR_NAME) attrs[asciiLower(name)] = value;
  }
  return attrs;
}

/** The part of the page worth scanning for meta and title: up to </head>, at most 128 KB. */
function headOf(html: string): string {
  const part = html.slice(0, HEAD_SCAN_BYTES);
  const end = asciiLower(part).indexOf("</head");
  return end === -1 ? part : part.slice(0, end);
}

function metaContent(head: string, lower: string, key: string): string | undefined {
  let pos = 0;
  for (let count = 0; count < MAX_META; count++) {
    const i = lower.indexOf("<meta", pos);
    if (i === -1) break;
    const end = lower.indexOf(">", i);
    if (end === -1) break;
    pos = end + 1;
    const next = lower[i + 5] ?? "";
    if (!isSpace(next) && next !== "/") continue;
    const attrs = parseAttrs(head.slice(i + 5, end));
    if (asciiLower(attrs.property ?? attrs.name ?? "") === key && attrs.content)
      return attrs.content;
  }
  return undefined;
}

/** Removes <...> pairs without regex backtracking. An unclosed "<" is kept as text. */
function stripTags(s: string): string {
  let out = "";
  let pos = 0;
  for (;;) {
    const i = s.indexOf("<", pos);
    if (i === -1) return out + s.slice(pos);
    const j = s.indexOf(">", i);
    if (j === -1) return out + s.slice(pos);
    out += s.slice(pos, i) + " ";
    pos = j + 1;
  }
}

function titleTag(head: string, lower: string): string | undefined {
  let pos = 0;
  for (let tries = 0; tries < 5; tries++) {
    const i = lower.indexOf("<title", pos);
    if (i === -1) return undefined;
    const next = lower[i + 6] ?? "";
    const gt = lower.indexOf(">", i);
    if (gt === -1) return undefined;
    pos = gt + 1;
    if (!isSpace(next) && next !== ">") continue;
    const close = lower.indexOf("</title", gt);
    if (close === -1) return undefined;
    return stripTags(head.slice(gt + 1, Math.min(close, gt + 1 + 2000)));
  }
  return undefined;
}

function jsonLdBlocks(html: string): string[] {
  const lower = asciiLower(html);
  const out: string[] = [];
  let pos = 0;
  for (let n = 0; n < MAX_SCRIPTS; n++) {
    const m = lower.indexOf("application/ld+json", pos);
    if (m === -1) break;
    const open = lower.lastIndexOf("<script", m);
    const gt = lower.indexOf(">", m);
    if (gt === -1) break;
    pos = gt + 1;
    if (open < 0 || gt - open > 500) continue;
    const close = lower.indexOf("</script", gt);
    if (close === -1) break;
    out.push(html.slice(gt + 1, close));
    pos = close;
  }
  return out;
}

function findJobPosting(node: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || node === null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findJobPosting(n, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const t = o["@type"];
  if (t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"))) return o;
  return findJobPosting(o["@graph"], depth + 1);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Reads title and company from page text, and says which source gave the title. */
export function extractDetailsWithSource(html: string): {
  title?: string;
  company?: string;
  titleSource?: TitleSource;
} {
  let jobTitle: string | undefined;
  let company: string | undefined;
  for (const block of jsonLdBlocks(html)) {
    try {
      const jp = findJobPosting(JSON.parse(block));
      if (!jp) continue;
      jobTitle = str(jp.title);
      const org = jp.hiringOrganization;
      company =
        typeof org === "string"
          ? org
          : org && typeof org === "object"
            ? str((org as Record<string, unknown>).name)
            : undefined;
      break;
    } catch {
      continue;
    }
  }
  const head = headOf(html);
  const lower = asciiLower(head);
  const fromLd = cleanText(jobTitle ?? "");
  const fromOg = fromLd ? undefined : cleanText(metaContent(head, lower, "og:title") ?? "");
  const fromTag = fromLd || fromOg ? undefined : cleanText(titleTag(head, lower) ?? "");
  const title = fromLd ?? fromOg ?? fromTag;
  const titleSource: TitleSource | undefined = fromLd ? "jsonld" : fromOg ? "og" : fromTag ? "title" : undefined;
  const co = cleanText(company ?? "");
  return {
    ...(title ? { title } : {}),
    ...(co ? { company: co } : {}),
    ...(titleSource ? { titleSource } : {}),
  };
}

/** Reads title and company from page text. The page is treated purely as data. */
export function extractDetails(html: string): { title?: string; company?: string } {
  const { title, company } = extractDetailsWithSource(html);
  return { ...(title ? { title } : {}), ...(company ? { company } : {}) };
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

interface Options {
  fetchImpl?: FetchFn;
  timeoutMs?: number;
  /** The own hostname of this app, never fetched. */
  selfHost?: string;
}

async function readCapped(res: Response): Promise<{ text: string; truncated: boolean }> {
  const len = Number(res.headers.get("content-length"));
  if (Number.isFinite(len) && len > MAX_BODY_BYTES) return { text: "", truncated: true };
  if (!res.body) return { text: "", truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.length > MAX_BODY_BYTES) {
      chunks.push(value.slice(0, MAX_BODY_BYTES - total));
      total = MAX_BODY_BYTES;
      truncated = true;
      await reader.cancel().catch(() => undefined);
      break;
    }
    chunks.push(value);
    total += value.length;
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(buf), truncated };
}

/** Fetches a job page and returns only a title and company. No cookies, every redirect hop re-checked. */
export async function fetchPreview(rawUrl: string, opts: Options = {}): Promise<PreviewResult> {
  const doFetch: FetchFn = opts.fetchImpl ?? ((i, init) => fetch(i, init));
  let current = parseSafeUrl(rawUrl, undefined, opts.selfHost);
  if (!current) return { ok: false, reason: "blocked" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const res = await doFetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        credentials: "omit",
        signal: ctrl.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        await res.body?.cancel().catch(() => undefined);
        if (!loc || hop === MAX_HOPS) return { ok: false, reason: "fetch-failed" };
        const next = parseSafeUrl(loc, current.toString(), opts.selfHost);
        if (!next) return { ok: false, reason: "blocked" };
        current = next;
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined);
        if (res.status === 404 || res.status === 410) return { ok: false, reason: "not-found" };
        if (res.status === 401 || res.status === 403 || res.status === 429)
          return { ok: false, reason: "blocked-by-site" };
        return { ok: false, reason: "fetch-failed" };
      }
      const type = (res.headers.get("content-type") ?? "").toLowerCase();
      if (!type.startsWith("text/html")) {
        await res.body?.cancel().catch(() => undefined);
        return { ok: false, reason: "not-html" };
      }
      let capped: { text: string; truncated: boolean };
      try {
        capped = await readCapped(res);
      } catch {
        if (ctrl.signal.aborted) return { ok: false, reason: "timeout" };
        return { ok: false, reason: "read-failed" };
      }
      const { text, truncated } = capped;
      const found = extractDetailsWithSource(text);
      if (found.title || found.company) return { ok: true, ...found };
      return { ok: false, reason: truncated ? "too-large" : "no-details" };
    }
    return { ok: false, reason: "fetch-failed" };
  } catch {
    // Never log here: the error message could carry the url.
    return { ok: false, reason: ctrl.signal.aborted ? "timeout" : "fetch-failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** Coarse global limiter per isolate. Keeps no per-person data. */
export function createRateGuard(max: number, windowMs: number, now: () => number = Date.now) {
  let start = now();
  let count = 0;
  return (): boolean => {
    const t = now();
    if (t - start >= windowMs) {
      start = t;
      count = 0;
    }
    count += 1;
    return count <= max;
  };
}
