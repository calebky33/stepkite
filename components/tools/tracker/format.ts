import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import type { Job } from "@/lib/tracker/schema";

const pad = (n: number) => String(n).padStart(2, "0");

export function formatWhen(iso: string, country: CountryCode, withTime = false): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat(COUNTRY_INFO[country].locale, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

/** Value for an input of type date, in the viewer's time zone. */
export function toDateInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Value for an input of type datetime-local. */
export function toDateTimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Turns an input value back into an ISO string. Null when empty or not a date. */
export function fromInput(value: string): string | null {
  if (value.trim() === "") return null;
  const d = new Date(value.length === 10 ? `${value}T09:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const PERIOD_WORDS = { annual: "a year", monthly: "a month", weekly: "a week" } as const;

function money(amount: number, currency: string, country: CountryCode): string {
  try {
    return new Intl.NumberFormat(COUNTRY_INFO[country].locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** "£40,000 to £50,000 a year", or an empty string when the job has no figures. */
export function describeSalary(job: Job, country: CountryCode): string {
  const s = job.salary;
  if (!s) return "";
  const { min, max, currency } = s;
  if (min === undefined && max === undefined) return "";
  const low = min ?? max ?? 0;
  const range =
    min !== undefined && max !== undefined && min !== max
      ? `${money(min, currency, country)} to ${money(max, currency, country)}`
      : money(low, currency, country);
  return `${range} ${PERIOD_WORDS[s.period]}`;
}
