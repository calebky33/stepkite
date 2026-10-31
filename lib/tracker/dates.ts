/** Date helpers. Date only values are read in the user's own time zone. */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function localDate(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
  s: number,
  ms: number,
): Date | null {
  const date = new Date(y, m - 1, d, h, min, s, ms);
  // Rejects 2026-02-31, which Date would roll into March.
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** The last millisecond of a local day, as an ISO instant. Null for anything but YYYY-MM-DD. */
export function endOfLocalDayIso(value: string): string | null {
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  const date = localDate(Number(m[1]), Number(m[2]), Number(m[3]), 23, 59, 59, 999);
  return date ? date.toISOString() : null;
}

/** The first millisecond of a local day, as an ISO instant. Null for anything but YYYY-MM-DD. */
export function startOfLocalDayIso(value: string): string | null {
  const m = DATE_ONLY.exec(value);
  if (!m) return null;
  const date = localDate(Number(m[1]), Number(m[2]), Number(m[3]), 0, 0, 0, 0);
  return date ? date.toISOString() : null;
}

/**
 * When a due value falls, in milliseconds. A date only value counts as the end of that
 * local day, so a step due "today" is not overdue at 9am. NaN when it cannot be read.
 */
export function dueInstant(value: string): number {
  const end = endOfLocalDayIso(value);
  return end ? Date.parse(end) : Date.parse(value);
}

/**
 * Turns a date only or offset date into an ISO instant. Date only values become the start
 * of the local day, or the end when `end` is true. Null when it is not a real date.
 */
export function normaliseDate(value: string, end = false): string | null {
  const v = value.trim();
  if (DATE_ONLY.test(v)) return end ? endOfLocalDayIso(v) : startOfLocalDayIso(v);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
