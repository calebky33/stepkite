export type Period = "year" | "month" | "week";

export const PERIODS_PER_YEAR: Record<Period, number> = { year: 1, month: 12, week: 52 };

/**
 * Re-expresses an amount when the pay period changes, so £30,000 a year becomes £2,500 a month
 * and the same pay is shown, not a different salary. Rounded to pence, cents or paise.
 */
export function convertGross(gross: number | null, from: Period, to: Period): number | null {
  if (gross === null || from === to) return gross;
  const yearly = gross * PERIODS_PER_YEAR[from];
  return Math.round((yearly / PERIODS_PER_YEAR[to]) * 100) / 100;
}
