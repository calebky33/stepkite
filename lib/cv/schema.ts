import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";

/** Hard caps. The editor shows soft warnings earlier (docs/CV-BLUEPRINT.md). */
const short = z.string().trim().max(120);
const medium = z.string().trim().max(500);
const long = z.string().trim().max(4000);
const bullet = z.string().trim().max(300);

/** Year and month only. Day-level dates are never needed on a CV. */
const monthYear = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a year and month, like 2024-03.");

export const contactSchema = z.object({
  fullName: short,
  email: z.string().trim().max(254),
  phone: z.string().trim().max(32),
  city: short,
  links: z.array(z.object({ label: short, url: z.string().trim().max(300) })).max(6),
  /** Only shown when the country rules allow it. */
  dateOfBirth: z.string().max(20).optional(),
  nationality: short.optional(),
});

export const experienceSchema = z.object({
  id: z.string().min(1).max(64),
  role: short,
  employer: short,
  location: short,
  start: monthYear,
  end: monthYear.nullable(),
  bullets: z.array(bullet).max(12),
});

export const educationSchema = z.object({
  id: z.string().min(1).max(64),
  qualification: short,
  institution: short,
  start: monthYear.nullable(),
  end: monthYear.nullable(),
  details: medium,
});

export const skillGroupSchema = z.object({
  id: z.string().min(1).max(64),
  label: short,
  items: z.array(short).max(40),
});

export const SECTION_KEYS = ["summary", "experience", "impact", "education", "skills"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const cvSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1).max(64),
  title: short,
  country: z.enum(COUNTRIES),
  templateId: z.string().min(1).max(64),
  /** Style tokens are clamped on load and save. Free-form values never reach CSS. */
  style: z.object({
    accent: z.string().max(16),
    fontPair: z.string().max(32),
    fontScale: z.number().min(0.9).max(1.1),
    spacing: z.enum(["compact", "normal", "roomy"]),
    marginMm: z.number().min(12).max(24),
  }),
  contact: contactSchema,
  summary: long,
  experience: z.array(experienceSchema).max(20),
  education: z.array(educationSchema).max(10),
  skills: z.array(skillGroupSchema).max(10),
  /** Quantified impact lines. Absent in older saves, so it defaults to none. */
  impact: z.array(bullet).max(12).default([]),
  sectionOrder: z.array(z.enum(SECTION_KEYS)).max(SECTION_KEYS.length),
  updatedAt: z.iso.datetime(),
});

export type Cv = z.infer<typeof cvSchema>;

export function emptyCv(id: string, country: Cv["country"], nowIso: string): Cv {
  return {
    schemaVersion: 1,
    id,
    title: "",
    country,
    templateId: "plain",
    style: { accent: "#1a3fd1", fontPair: "system", fontScale: 1, spacing: "normal", marginMm: 18 },
    contact: { fullName: "", email: "", phone: "", city: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    impact: [],
    sectionOrder: [...SECTION_KEYS],
    updatedAt: nowIso,
  };
}
