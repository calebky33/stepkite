import { normaliseDate } from "./dates";
import { legacyStageId } from "./legacy";
import { jobSchema, type Job, type StageRecord } from "./schema";

export const CSV_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_MAX_ROWS = 5000;

export const CSV_FIELDS = [
  "title",
  "company",
  "url",
  "stage",
  "location",
  "source",
  "salaryMin",
  "salaryMax",
  "currency",
  "period",
  "savedAt",
  "appliedAt",
  "nextStep",
  "nextStepDue",
  "tags",
  "notes",
  "archivedAt",
] as const;
export type CsvField = (typeof CSV_FIELDS)[number];

/** Column names as people read them, used in messages. */
export const CSV_FIELD_LABELS: Record<CsvField, string> = {
  title: "Title",
  company: "Company",
  url: "Link",
  stage: "Stage",
  location: "Location",
  source: "Source",
  salaryMin: "Lowest pay",
  salaryMax: "Highest pay",
  currency: "Currency",
  period: "Pay period",
  savedAt: "Saved on",
  appliedAt: "Applied on",
  nextStep: "Next step",
  nextStepDue: "Next step due",
  tags: "Tags",
  notes: "Notes",
  archivedAt: "Archived on",
};

/** Field name to column index. Missing fields are left empty. */
export type CsvMapping = Partial<Record<string, number>>;

/** Cells that start with these can run as formulas in a spreadsheet. */
const RISKY = /^[=+\-@\t\r]/;
const GUARDED = /^'[=+\-@\t\r]/;

function cell(value: string): string {
  const safe = RISKY.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Tags are joined with ";". A ";" or a backslash inside a tag is escaped with a backslash. */
function joinTags(tags: readonly string[]): string {
  return tags.map((t) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;")).join(";");
}

function splitTags(value: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charAt(i);
    if (ch === "\\" && i + 1 < value.length) {
      cur += value.charAt(i + 1);
      i += 1;
    } else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((t) => t.trim()).filter((t) => t !== "");
}

export function exportCsv(jobs: readonly Job[], stages: readonly StageRecord[]): string {
  const lines = [CSV_FIELDS.join(",")];
  for (const job of jobs) {
    const values: Record<CsvField, string> = {
      title: job.title,
      company: job.company,
      url: job.url ?? "",
      stage: stages.find((s) => s.id === job.stageId)?.name ?? "",
      location: job.location ?? "",
      source: job.source ?? "",
      salaryMin: job.salary?.min?.toString() ?? "",
      salaryMax: job.salary?.max?.toString() ?? "",
      currency: job.salary?.currency ?? "",
      period: job.salary?.period ?? "",
      savedAt: job.savedAt,
      appliedAt: job.appliedAt ?? "",
      nextStep: job.nextStep?.text ?? "",
      nextStepDue: job.nextStep?.dueAt ?? "",
      tags: joinTags(job.tags ?? []),
      notes: job.notes,
      archivedAt: job.archivedAt ?? "",
    };
    lines.push(CSV_FIELDS.map((f) => cell(values[f])).join(","));
  }
  return lines.join("\r\n") + "\r\n";
}

export type CsvError = "too-big" | "too-many-rows" | "bad-quotes" | "wrong-delimiter";

export const CSV_ERROR_MESSAGES: Record<CsvError, string> = {
  "too-big": "That file is over 5 MB. Split it into smaller files.",
  "too-many-rows": "That file has more than 5,000 rows. Split it into smaller files.",
  "bad-quotes": "A quote mark in that file is not closed, so the rows cannot be read.",
  "wrong-delimiter":
    "That file puts everything in one column. It looks like it uses semicolons or tabs. Save it again as a CSV with commas.",
};

export type ParsedCsv = {
  rows: string[][];
  /** Blank lines that were left out. */
  skippedBlank: number;
};

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Splits CSV text and reports what it skipped. See parseCsv for the size argument. */
export function parseCsvDetailed(
  input: string,
  size: number = utf8Length(input),
): { ok: true; value: ParsedCsv } | { ok: false; error: CsvError } {
  if (size > CSV_MAX_BYTES) return { ok: false, error: "too-big" };
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let skippedBlank = 0;
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let touched = false;
  let tooMany = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
      // Row 0 is the header, so up to CSV_MAX_ROWS + 1 rows are allowed.
      if (rows.length > CSV_MAX_ROWS + 1) tooMany = true;
    } else skippedBlank += 1;
    row = [];
    touched = false;
  };

  for (let i = 0; i < text.length && !tooMany; i += 1) {
    const ch = text.charAt(i);
    if (quoted) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") {
      quoted = true;
      touched = true;
    } else if (ch === ",") {
      endField();
      touched = true;
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text.charAt(i + 1) === "\n") i += 1;
      endRow();
    } else {
      field += ch;
      touched = true;
    }
  }
  if (tooMany) return { ok: false, error: "too-many-rows" };
  if (quoted) return { ok: false, error: "bad-quotes" };
  if (touched || field !== "") endRow();
  if (tooMany) return { ok: false, error: "too-many-rows" };
  const header = rows[0];
  if (header && header.length === 1 && /[;\t]/.test(header[0] ?? "")) {
    return { ok: false, error: "wrong-delimiter" };
  }
  return { ok: true, value: { rows, skippedBlank } };
}

/**
 * Splits CSV text into rows of cells. Row 0 is usually the header.
 * `size` is the size in bytes. Callers with a File pass file.size. When it is left out the
 * UTF-8 length of the text is used, never the character count.
 */
export function parseCsv(
  input: string,
  size?: number,
): { ok: true; rows: string[][] } | { ok: false; error: CsvError } {
  const r = parseCsvDetailed(input, size);
  return r.ok ? { ok: true, rows: r.value.rows } : r;
}

export type ImportContext = {
  stages: readonly StageRecord[];
  now: string;
  /** Called with the row index to make an id. Inject for purity. */
  newId: (index: number) => string;
  /** Used when a row has a salary but no currency. Without it such rows are rejected. */
  defaultCurrency?: string;
  /** Cells in the header row. Rows with a different width are reported. */
  headerWidth?: number;
  /** Blank lines parseCsvDetailed left out, passed through to the summary. */
  skippedBlank?: number;
};

export type ImportRowError = { row: number; message: string };

export type ImportPreview = {
  jobs: Job[];
  errors: ImportRowError[];
  warnings: ImportRowError[];
  total: number;
  imported: number;
  skipped: number;
  skippedBlank: number;
  /** Rows that took a default because the cell was blank or unusable. */
  defaulted: { stage: number; currency: number; period: number };
};

/** Undoes the export guard: a leading quote before = + - @ tab or CR was added by us. */
function unguard(value: string): string {
  return GUARDED.test(value) ? value.slice(1) : value;
}

const MAX_ISSUES_PER_ROW = 3;
const SALARY_LABELS: ReadonlyMap<string, string> = new Map([
  ["min", CSV_FIELD_LABELS.salaryMin],
  ["max", CSV_FIELD_LABELS.salaryMax],
  ["currency", CSV_FIELD_LABELS.currency],
  ["period", CSV_FIELD_LABELS.period],
]);

/** Reads "50000", "£50,000", "50k", "1.2m". Undefined when blank, NaN when not a number. */
function parseMoney(value: string): number | undefined {
  const v = value.replace(/[£$€₹\s]/g, "").replace(/,/g, "");
  if (v === "") return undefined;
  const m = /^(\d+(?:\.\d+)?)([km])?$/i.exec(v);
  if (!m) return Number.NaN;
  const base = Number(m[1]);
  const suffix = (m[2] ?? "").toLowerCase();
  const n = suffix === "k" ? base * 1000 : suffix === "m" ? base * 1_000_000 : base;
  return Number.isFinite(n) ? n : Number.NaN;
}

function isField(name: string): name is CsvField {
  return (CSV_FIELDS as readonly string[]).includes(name);
}

/**
 * Turns data rows (header removed) into jobs. Every row is checked by jobSchema.
 * Row numbers start at 1 for the first data row. Messages never repeat cell text.
 */
export function importPreview(
  rows: readonly (readonly string[])[],
  mapping: CsvMapping,
  ctx: ImportContext,
): ImportPreview {
  const jobs: Job[] = [];
  const errors: ImportRowError[] = [];
  const warnings: ImportRowError[] = [];
  const defaulted = { stage: 0, currency: 0, period: 0 };
  const summary = (): ImportPreview => ({
    jobs,
    errors,
    warnings,
    total: rows.length,
    imported: jobs.length,
    skipped: rows.length - jobs.length,
    skippedBlank: ctx.skippedBlank ?? 0,
    defaulted,
  });

  const fallback = ctx.stages.find((s) => s.kind === "saved") ?? ctx.stages[0];
  if (!fallback || ctx.stages.length === 0) {
    errors.push({ row: 0, message: "There are no stages to put the jobs in. Add a stage first." });
    return summary();
  }

  let oddWidth = 0;
  let firstOdd = 0;

  rows.forEach((cells, index) => {
    const rowNo = index + 1;
    const issues: string[] = [];
    const label = (f: string) => (isField(f) ? CSV_FIELD_LABELS[f] : f);
    const get = (field: string): string => {
      const col = mapping[field];
      return col === undefined ? "" : unguard((cells[col] ?? "").trim());
    };

    if (ctx.headerWidth !== undefined && cells.length !== ctx.headerWidth) {
      oddWidth += 1;
      if (firstOdd === 0) firstOdd = rowNo;
    }

    // Stage
    const stageText = get("stage");
    const stageName = stageText.toLowerCase();
    let stage: StageRecord | undefined;
    if (stageName === "") {
      stage = fallback;
      defaulted.stage += 1;
    } else {
      const legacy = legacyStageId(stageName);
      stage =
        ctx.stages.find((s) => s.name.toLowerCase() === stageName) ??
        ctx.stages.find((s) => s.id === legacy) ??
        ctx.stages.find((s) => s.kind === stageName);
      if (!stage) {
        stage = fallback;
        defaulted.stage += 1;
        warnings.push({
          row: rowNo,
          message: `The stage in row ${rowNo} is not one of yours, so the job goes in ${fallback.name}.`,
        });
      }
    }

    // Salary
    const min = parseMoney(get("salaryMin"));
    const max = parseMoney(get("salaryMax"));
    const hasSalary = min !== undefined || max !== undefined;
    if ((min !== undefined && Number.isNaN(min)) || (max !== undefined && Number.isNaN(max)))
      issues.push(`Salary is not a number in row ${rowNo}`);
    const currencyText = get("currency");
    const currency = currencyText || ctx.defaultCurrency || "";
    if (hasSalary && !currencyText) {
      if (ctx.defaultCurrency) defaulted.currency += 1;
      else issues.push(`Currency is missing in row ${rowNo}`);
    }
    const periodText = get("period").toLowerCase();
    if (hasSalary && periodText === "") defaulted.period += 1;

    // Dates
    const dateOf = (field: CsvField, end = false): string | undefined => {
      const raw = get(field);
      if (raw === "") return undefined;
      const iso = normaliseDate(raw, end);
      if (iso === null) {
        issues.push(`${label(field)} is not a date in row ${rowNo}`);
        return undefined;
      }
      return iso;
    };
    const savedAt = dateOf("savedAt") ?? ctx.now;
    const appliedAt = dateOf("appliedAt");
    const archivedAt = dateOf("archivedAt");
    const dueAt = dateOf("nextStepDue", true);
    const step = get("nextStep");
    if ((step !== "") !== (get("nextStepDue") !== "")) {
      warnings.push({
        row: rowNo,
        message: `The next step in row ${rowNo} needs both text and a due date, so it was left out.`,
      });
    }

    const tags = splitTags(get("tags"));
    const candidate = {
      id: ctx.newId(index),
      title: get("title"),
      company: get("company"),
      url: get("url") || undefined,
      stageId: stage.id,
      location: get("location") || undefined,
      source: get("source") || undefined,
      salary: hasSalary
        ? {
            min: min !== undefined && !Number.isNaN(min) ? min : undefined,
            max: max !== undefined && !Number.isNaN(max) ? max : undefined,
            currency: currency || "-",
            period: periodText || "annual",
          }
        : undefined,
      savedAt,
      appliedAt,
      nextStep: step && dueAt ? { text: step, dueAt } : undefined,
      notes: get("notes"),
      archivedAt,
      tags: tags.length > 0 ? tags : undefined,
      updatedAt: ctx.now,
    };
    const parsed = jobSchema.safeParse(candidate);
    if (!parsed.success) {
      const seen = new Set<string>();
      for (const issue of parsed.error.issues) {
        const top = String(issue.path[0] ?? "row");
        const sub = String(issue.path[1] ?? "");
        const where = top === "salary" ? (SALARY_LABELS.get(sub) ?? "Salary") : label(top);
        if (seen.has(where)) continue;
        seen.add(where);
        issues.push(`Check ${where} in row ${rowNo}`);
      }
    }
    if (issues.length === 0 && parsed.success) {
      jobs.push(parsed.data);
      return;
    }
    for (const message of issues.slice(0, MAX_ISSUES_PER_ROW))
      errors.push({ row: rowNo, message: `${message}.` });
  });

  if (oddWidth > 0) {
    warnings.push({
      row: firstOdd,
      message: `${oddWidth} rows have a different number of columns from the header, starting at row ${firstOdd}.`,
    });
  }
  return summary();
}
