import { z } from "zod";

export const STAGES = ["saved", "applied", "interview", "offer", "closed"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

export const jobSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1, "Enter the job title.").max(160, "Keep the title under 160 characters."),
  company: z.string().trim().min(1, "Enter the company.").max(160, "Keep the company under 160 characters."),
  url: z
    .url({ protocol: /^https?$/, error: "Enter a full link that starts with http or https." })
    .max(2000, "That link is too long.")
    .optional(),
  stage: z.enum(STAGES),
  updatedAt: z.iso.datetime(),
});

export type Job = z.infer<typeof jobSchema>;
