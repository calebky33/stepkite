import { fromInput, toDateInput, toDateTimeInput } from "./format";
import { jobSchema, type Job } from "@/lib/tracker/schema";

export type Period = "annual" | "monthly" | "weekly";

export type JobValues = {
  title: string;
  company: string;
  url: string;
  location: string;
  source: string;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  period: Period;
  nextStep: string;
  nextStepDue: string;
  appliedAt: string;
  notes: string;
};

export type JobErrors = Partial<Record<keyof JobValues, string>>;

export function emptyValues(currency: string): JobValues {
  return {
    title: "",
    company: "",
    url: "",
    location: "",
    source: "",
    salaryMin: "",
    salaryMax: "",
    currency,
    period: "annual",
    nextStep: "",
    nextStepDue: "",
    appliedAt: "",
    notes: "",
  };
}

export function valuesFromJob(job: Job, currency: string): JobValues {
  return {
    title: job.title,
    company: job.company,
    url: job.url ?? "",
    location: job.location ?? "",
    source: job.source ?? "",
    salaryMin: job.salary?.min?.toString() ?? "",
    salaryMax: job.salary?.max?.toString() ?? "",
    currency: job.salary?.currency ?? currency,
    period: job.salary?.period ?? "annual",
    nextStep: job.nextStep?.text ?? "",
    nextStepDue: toDateTimeInput(job.nextStep?.dueAt),
    appliedAt: toDateInput(job.appliedAt),
    notes: job.notes,
  };
}

/** What the form does not edit: identity, stage, tags, contacts and dates it keeps. */
export type JobBase = Pick<Job, "id" | "stageId"> &
  Partial<Pick<Job, "savedAt" | "tags" | "contactIds" | "archivedAt">>;

const KEY_FOR_PATH: Record<string, keyof JobValues> = {
  title: "title",
  company: "company",
  url: "url",
  location: "location",
  source: "source",
  salary: "salaryMin",
  nextStep: "nextStep",
  appliedAt: "appliedAt",
  notes: "notes",
};

function figure(text: string): number | undefined | "bad" {
  if (text.trim() === "") return undefined;
  const n = Number(text.replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : "bad";
}

/** Checks the form and builds a job. Messages are plain and say what to fix. */
export function buildJob(
  v: JobValues,
  base: JobBase,
  now: string,
): { ok: true; job: Job } | { ok: false; errors: JobErrors } {
  const errors: JobErrors = {};
  const min = figure(v.salaryMin);
  const max = figure(v.salaryMax);
  if (min === "bad") errors.salaryMin = "Enter the figure as a number, like 45000.";
  if (max === "bad") errors.salaryMax = "Enter the figure as a number, like 55000.";
  if (typeof min === "number" && typeof max === "number" && min > max) {
    errors.salaryMax = "The top figure should be at least the bottom figure.";
  }
  const due = v.nextStepDue.trim() === "" ? undefined : fromInput(v.nextStepDue);
  if (v.nextStepDue.trim() !== "" && !due) errors.nextStepDue = "Enter a real date.";
  if (v.nextStep.trim() !== "" && v.nextStepDue.trim() === "") {
    errors.nextStepDue = "Add a date for the next step.";
  }
  if (v.nextStep.trim() === "" && v.nextStepDue.trim() !== "") {
    errors.nextStep = "Say what the next step is.";
  }
  const applied = v.appliedAt.trim() === "" ? undefined : fromInput(v.appliedAt);
  if (v.appliedAt.trim() !== "" && !applied) errors.appliedAt = "Enter a real date.";

  const hasSalary = typeof min === "number" || typeof max === "number";
  const candidate = {
    id: base.id,
    title: v.title,
    company: v.company,
    url: v.url.trim() === "" ? undefined : v.url.trim(),
    stageId: base.stageId,
    location: v.location.trim() === "" ? undefined : v.location,
    source: v.source.trim() === "" ? undefined : v.source,
    salary: hasSalary
      ? {
          min: typeof min === "number" ? min : undefined,
          max: typeof max === "number" ? max : undefined,
          currency: v.currency,
          period: v.period,
        }
      : undefined,
    savedAt: base.savedAt ?? now,
    appliedAt: applied ?? undefined,
    nextStep: v.nextStep.trim() !== "" && due ? { text: v.nextStep, dueAt: due } : undefined,
    notes: v.notes,
    archivedAt: base.archivedAt,
    tags: base.tags,
    contactIds: base.contactIds,
    updatedAt: now,
  };
  const parsed = jobSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = KEY_FOR_PATH[String(issue.path[0])];
      if (key && !errors[key]) errors[key] = issue.message;
    }
  }
  if (!parsed.success && Object.keys(errors).length === 0) {
    errors.title = "Check the details and try again.";
  }
  if (Object.keys(errors).length > 0 || !parsed.success) {
    return { ok: false, errors };
  }
  return { ok: true, job: parsed.data };
}
