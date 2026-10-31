import { z } from "zod";

/** Legacy fixed stages. Kept until the UI slice swaps the board to stage records. */
export const STAGES = ["saved", "applied", "interview", "offer", "closed"] as const;
export type Stage = (typeof STAGES)[number];

/** Legacy labels, see STAGES. */
export const STAGE_LABELS: Record<Stage, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export const STAGE_KINDS = [
  "saved",
  "applied",
  "screening",
  "interview",
  "offer",
  "closed",
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export const stageSchema = z.object({
  id: z.string().min(1).max(64),
  name: z
    .string()
    .trim()
    .min(1, "Enter a stage name.")
    .max(40, "Keep the name under 40 characters."),
  order: z.number().int(),
  kind: z.enum(STAGE_KINDS),
});
export type StageRecord = z.infer<typeof stageSchema>;

export const DEFAULT_STAGES: readonly StageRecord[] = [
  { id: "stage-saved", name: "Saved", order: 0, kind: "saved" },
  { id: "stage-applied", name: "Applied", order: 1, kind: "applied" },
  { id: "stage-screening", name: "Screening", order: 2, kind: "screening" },
  { id: "stage-interview", name: "Interview", order: 3, kind: "interview" },
  { id: "stage-offer", name: "Offer", order: 4, kind: "offer" },
  { id: "stage-rejected", name: "Rejected", order: 5, kind: "closed" },
  { id: "stage-withdrawn", name: "Withdrawn", order: 6, kind: "closed" },
];

const salarySchema = z
  .object({
    min: z.number().nonnegative().optional(),
    max: z.number().nonnegative().optional(),
    currency: z.string().trim().min(1).max(8),
    period: z.enum(["annual", "monthly", "weekly"]),
  })
  .refine((s) => s.min === undefined || s.max === undefined || s.min <= s.max, {
    message: "The lowest pay must not be above the highest.",
    path: ["max"],
  });

const nextStepSchema = z.object({
  text: z.string().trim().min(1).max(300),
  dueAt: z.iso.datetime(),
});

const tagsSchema = z
  .array(z.string().trim().min(1).max(30))
  .max(10)
  .refine((tags) => new Set(tags.map((t) => t.toLowerCase())).size === tags.length, {
    message: "Each tag can be used once.",
  });

/**
 * jobSchema ends in a transform, so it is a pipe and has no .extend or .pick.
 * Build variants from the plain object inside it, or validate then spread.
 */
export const jobSchema = z
  .object({
    id: z.string().min(1).max(64),
    title: z
      .string()
      .trim()
      .min(1, "Enter the job title.")
      .max(160, "Keep the title under 160 characters."),
    company: z
      .string()
      .trim()
      .min(1, "Enter the company.")
      .max(160, "Keep the company under 160 characters."),
    url: z
      .url({ protocol: /^https?$/, error: "Enter a full link that starts with http or https." })
      .max(2000, "That link is too long.")
      .optional(),
    /** Legacy field, read only. migrateJob maps it to stageId. New rows leave it out. */
    stage: z.enum(STAGES).optional(),
    stageId: z.string().min(1).max(64).default("stage-saved"),
    location: z.string().trim().max(160).optional(),
    source: z.string().trim().max(160).optional(),
    salary: salarySchema.optional(),
    savedAt: z.iso.datetime().optional(),
    appliedAt: z.iso.datetime().optional(),
    nextStep: nextStepSchema.optional(),
    notes: z.string().max(5000, "Keep notes under 5,000 characters.").default(""),
    archivedAt: z.iso.datetime().optional(),
    tags: tagsSchema.optional(),
    contactIds: z
      .array(z.string().min(1).max(64))
      .max(50)
      .refine((ids) => new Set(ids).size === ids.length, { message: "Each contact can be linked once." })
      .optional(),
    updatedAt: z.iso.datetime(),
  })
  .transform((job) => ({ ...job, savedAt: job.savedAt ?? job.updatedAt }));

export type Job = z.infer<typeof jobSchema>;

export const ACTIVITY_TYPES = ["saved", "applied", "moved", "interview", "note", "edited"] as const;

export const activitySchema = z.object({
  id: z.string().min(1).max(64),
  jobId: z.string().min(1).max(64),
  type: z.enum(ACTIVITY_TYPES),
  text: z.string().max(1000).optional(),
  at: z.iso.datetime(),
});
export type Activity = z.infer<typeof activitySchema>;

export const INTERVIEW_KINDS = ["phone", "video", "onsite"] as const;
export type InterviewKind = (typeof INTERVIEW_KINDS)[number];

export const interviewSchema = z.object({
  id: z.string().min(1).max(64),
  jobId: z.string().min(1).max(64),
  at: z.iso.datetime(),
  kind: z.enum(INTERVIEW_KINDS),
  people: z.string().trim().max(300).optional(),
  prep: z.string().max(5000).optional(),
  result: z.string().trim().max(1000).optional(),
});
export type Interview = z.infer<typeof interviewSchema>;

export const contactSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Enter a name.").max(160),
  role: z.string().trim().max(160).optional(),
  company: z.string().trim().max(160).optional(),
  email: z
    .preprocess((v) => (v === "" ? undefined : v), z.email().max(254).optional())
    .optional(),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().max(5000).optional(),
  lastContactAt: z.iso.datetime().optional(),
});
export type Contact = z.infer<typeof contactSchema>;
