import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";

/** Hard caps. The editor shows soft warnings earlier (docs/CV-BLUEPRINT.md). */
export const CV_SCHEMA_VERSION = 2;

/** Empty is allowed while editing. Anything else must be an http or https link. */
function isWebUrl(value: string): boolean {
  if (value === "") return true;
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

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
  links: z
    .array(
      z.object({
        label: short,
        url: z
          .string()
          .trim()
          .max(300)
          .refine(isWebUrl, "Use a link that starts with http or https."),
      }),
    )
    .max(6),
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

export const certificationSchema = z.object({
  id: z.string().min(1).max(64),
  name: short,
  issuer: short,
  date: monthYear.nullable(),
});

/** Added only when the user chooses to. Nothing here is pre-filled. */
export const referenceSchema = z.object({
  id: z.string().min(1).max(64),
  name: short,
  role: short,
  contact: short,
});

export const SECTION_KEYS = [
  "summary",
  "experience",
  "impact",
  "education",
  "skills",
  "certifications",
  "interests",
  "references",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const cvSchema = z.object({
  /** 1 was saved before certifications, interests and references. migrateCv upgrades it. */
  schemaVersion: z.literal(CV_SCHEMA_VERSION),
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
  certifications: z.array(certificationSchema).max(15).default([]),
  interests: z.string().trim().max(500).default(""),
  references: z.array(referenceSchema).max(4).default([]),
  sectionOrder: z
    .array(z.enum(SECTION_KEYS))
    .max(SECTION_KEYS.length)
    .refine((keys) => new Set(keys).size === keys.length, "Each section can appear once."),
  updatedAt: z.iso.datetime(),
});

export type Cv = z.infer<typeof cvSchema>;

/**
 * Brings a saved CV of any older version up to the current shape before validation.
 * Missing sections default to empty, and the section order gains the new keys at the end.
 */
export function migrateCv(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return raw;
  const old = raw as Record<string, unknown>;
  if (old.schemaVersion !== 1) return raw;
  const given = Array.isArray(old.sectionOrder) ? old.sectionOrder : [];
  const order: string[] = [];
  for (const key of given) {
    if (SECTION_KEYS.some((k) => k === key) && !order.includes(key as string)) {
      order.push(key as string);
    }
  }
  const merged = [...order, ...SECTION_KEYS.filter((k) => !order.includes(k))];
  return { ...old, schemaVersion: CV_SCHEMA_VERSION, sectionOrder: merged };
}

/** Use this to read anything from storage or a file. It accepts every version ever saved. */
export const storedCvSchema = z.preprocess(migrateCv, cvSchema);

export function emptyCv(id: string, country: Cv["country"], nowIso: string): Cv {
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    id,
    title: "",
    country,
    // Kept as "plain": the template registry lives in components and imports this file's types,
    // so reading it here would invert the layering. resolveTemplate maps unknown ids to the
    // country's first template.
    templateId: "plain",
    style: { accent: "#1a3fd1", fontPair: "system", fontScale: 1, spacing: "normal", marginMm: 18 },
    contact: { fullName: "", email: "", phone: "", city: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    impact: [],
    certifications: [],
    interests: "",
    references: [],
    sectionOrder: [...SECTION_KEYS],
    updatedAt: nowIso,
  };
}
