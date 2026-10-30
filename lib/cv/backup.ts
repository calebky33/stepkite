import { z } from "zod";
import { storedCvSchema, type Cv } from "./schema";
import { clampStyle } from "./style";

export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;
export const BACKUP_MAX_CVS = 50;
const BACKUP_KIND = "stepkite-cv-backup";

const backupSchema = z.object({
  kind: z.literal(BACKUP_KIND),
  version: z.literal(1),
  exportedAt: z.string().max(40),
  cvs: z.array(storedCvSchema).max(BACKUP_MAX_CVS),
});

export type ImportError = "too-big" | "not-json" | "wrong-shape" | "has-script" | "empty";

export const IMPORT_MESSAGES: Record<ImportError, string> = {
  "too-big": "That file is too large to be a CV backup. Backups are under 5 MB.",
  "not-json": "We could not read that file. Choose a backup file you saved from Stepkite.",
  "wrong-shape":
    "That file is not a Stepkite backup, or part of it is damaged. Nothing was changed.",
  "has-script": "That file contains code, so we did not open it. Nothing was changed.",
  empty: "That backup has no CVs in it. Nothing was changed.",
};

export function buildBackup(cvs: readonly Cv[], now: Date): string {
  return JSON.stringify({ kind: BACKUP_KIND, version: 1, exportedAt: now.toISOString(), cvs });
}

const SCRIPT_TAG = /<\s*\/?\s*script/i;
const SCRIPT_URL = /^\s*(?:javascript|vbscript|data):/i;

/** Script tags anywhere count. A script scheme counts only in a link url, not in normal text. */
function hasScriptAt(value: unknown, key: string, depth: number): boolean {
  if (depth > 20) return true;
  if (typeof value === "string") {
    return SCRIPT_TAG.test(value) || (key === "url" && SCRIPT_URL.test(value));
  }
  if (Array.isArray(value)) return value.some((v) => hasScriptAt(v, key, depth + 1));
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).some(([k, v]) => hasScriptAt(v, k, depth + 1));
  }
  return false;
}

function hasScript(value: unknown): boolean {
  try {
    return hasScriptAt(value, "", 0);
  } catch {
    return true;
  }
}

/**
 * Checks a backup file's text. Nothing is stored here. Unknown fields are dropped by the
 * schema, every style value is clamped, and text with script markup is refused outright.
 */
export function parseBackup(
  text: string,
  size: number = text.length,
): { ok: true; cvs: Cv[] } | { ok: false; error: ImportError } {
  if (size > BACKUP_MAX_BYTES) return { ok: false, error: "too-big" };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (hasScript(raw)) return { ok: false, error: "has-script" };
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "wrong-shape" };
  if (parsed.data.cvs.length === 0) return { ok: false, error: "empty" };
  const seen = new Set<string>();
  const cvs = parsed.data.cvs
    .filter((cv) => (seen.has(cv.id) ? false : (seen.add(cv.id), true)))
    .map((cv) => ({ ...cv, style: clampStyle(cv.style) }));
  return { ok: true, cvs };
}
