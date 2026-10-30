/**
 * Turns parsed text into a list of reviewable units, and turns the accepted units into a CV.
 * Every value is text from the file. Nothing is invented, and nothing is saved from here.
 */
import { cvSchema, type Cv } from "@/lib/cv/schema";
import { parseExtras } from "./extras";
import { LIMITS, parseCvText } from "./parse";
import { cleanValue } from "./sanitize";

export type Conf = "high" | "medium" | "low";

export type DraftField = {
  name: string;
  label: string;
  value: string;
  max: number;
  multiline?: boolean;
  hint?: string;
};

export type UnitKind =
  | "name"
  | "email"
  | "phone"
  | "city"
  | "link"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "impact"
  | "certification"
  | "interests"
  | "reference";

export type DraftUnit = {
  id: string;
  kind: UnitKind;
  /** Short name shown on the card, like "Job" or "Email". */
  title: string;
  confidence: Conf;
  accepted: boolean;
  fields: DraftField[];
};

export type ImportDraft = {
  units: DraftUnit[];
  notPlaced: string[];
  warnings: string[];
};

const DATE_HINT = "Year and month, like 2024-03.";
const DATE = /^\d{4}-(0[1-9]|1[0-2])$/;
const RANK: Record<Conf, number> = { low: 0, medium: 1, high: 2 };

const field = (
  name: string,
  label: string,
  value: string,
  max: number,
  extra: Partial<DraftField> = {},
): DraftField => ({ name, label, value: cleanValue(value, max, extra.multiline), max, ...extra });

const lines = (values: readonly string[]): string => values.join("\n");

/** Low confidence first, then medium, then high. The order within a group is the file order. */
export function orderForReview(units: readonly DraftUnit[]): DraftUnit[] {
  return units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => RANK[a.unit.confidence] - RANK[b.unit.confidence] || a.index - b.index)
    .map((entry) => entry.unit);
}

export function buildDraft(text: string): ImportDraft {
  const parsed = parseCvText(text);
  const extras = parseExtras(text);
  const units: DraftUnit[] = [];
  let n = 0;
  const add = (kind: UnitKind, title: string, confidence: Conf, fields: DraftField[]): void => {
    n += 1;
    units.push({ id: `unit-${n}`, kind, title, confidence, accepted: true, fields });
  };

  const { contact } = extras;
  if (contact.fullName) {
    const odd = contact.fullName.split(/\s+/).length > 5;
    add("name", "Full name", odd ? "low" : "medium", [
      field("value", "Full name", contact.fullName, 120),
    ]);
  }
  if (contact.email) add("email", "Email", "high", [field("value", "Email", contact.email, 254)]);
  if (contact.phone) add("phone", "Phone", "high", [field("value", "Phone", contact.phone, 32)]);
  if (contact.city) add("city", "City", "high", [field("value", "City", contact.city, 120)]);
  for (const link of contact.links) {
    add("link", "Link", "high", [
      field("label", "Link name", link.label, 120),
      field("url", "Link address", link.url, 300),
    ]);
  }
  if (parsed.summary) {
    add("summary", "Summary", "high", [
      field("value", "Summary", parsed.summary, LIMITS.summary, { multiline: true }),
    ]);
  }
  for (const job of parsed.experience) {
    const confidence: Conf =
      !job.role || !job.employer ? "low" : job.approximateDates ? "medium" : "high";
    add("experience", "Job", confidence, [
      field("role", "Job title", job.role, 120),
      field("employer", "Employer", job.employer, 120),
      field("location", "Location", job.location, 120),
      field("start", "Start", job.start, 7, { hint: DATE_HINT }),
      field("end", "End", job.end ?? "", 7, {
        hint: `${DATE_HINT} Leave blank if you still work here.`,
      }),
      field("bullets", "What you did, one line each", lines(job.bullets), 300 * 12 + 11, {
        multiline: true,
      }),
    ]);
  }
  for (const school of parsed.education) {
    const confidence: Conf =
      !school.qualification || !school.institution
        ? "low"
        : school.approximateDates
          ? "medium"
          : "high";
    add("education", "Education", confidence, [
      field("qualification", "Qualification", school.qualification, 120),
      field("institution", "School or university", school.institution, 120),
      field("start", "Start", school.start ?? "", 7, { hint: `${DATE_HINT} Optional.` }),
      field("end", "End", school.end ?? "", 7, { hint: `${DATE_HINT} Optional.` }),
      field("details", "Details", school.details, 500, { multiline: true }),
    ]);
  }
  if (parsed.techStack.length > 0) {
    add("skills", "Skills", parsed.confidence.techStack === "low" ? "low" : "high", [
      field("items", "Skills, one per line", lines(parsed.techStack), 120 * 40 + 39, {
        multiline: true,
      }),
    ]);
  }
  for (const line of parsed.impact) {
    add("impact", "Impact line", "high", [field("value", "Impact line", line, 300)]);
  }
  for (const cert of extras.certifications) {
    add("certification", "Certification", cert.date && cert.issuer ? "high" : "medium", [
      field("name", "Name", cert.name, 120),
      field("issuer", "Issued by", cert.issuer, 120),
      field("date", "Date", cert.date ?? "", 7, { hint: `${DATE_HINT} Optional.` }),
    ]);
  }
  if (extras.interests) {
    add("interests", "Interests", "high", [
      field("value", "Interests", extras.interests, 500, { multiline: true }),
    ]);
  }
  for (const ref of extras.references) {
    add("reference", "Reference", "low", [
      field("name", "Name", ref.name, 120),
      field("role", "Job title", ref.role, 120),
      field("contact", "Contact", ref.contact, 120),
    ]);
  }

  const seen = new Set<string>();
  const notPlaced: string[] = [];
  for (const raw of [...parsed.unplaced, ...parsed.skippedImpact, ...extras.leftover]) {
    const line = cleanValue(raw, 300);
    if (line && !seen.has(line) && notPlaced.length < 100) {
      seen.add(line);
      notPlaced.push(line);
    }
  }
  return { units, notPlaced, warnings: parsed.warnings };
}

/** Per field problems for one unit, in words. An empty object means the unit can be used. */
export function unitErrors(unit: DraftUnit): Record<string, string> {
  const errors: Record<string, string> = {};
  const get = (name: string): string =>
    unit.fields.find((f) => f.name === name)?.value.trim() ?? "";
  const needDate = (name: string, required: boolean) => {
    const value = get(name);
    if (!value && required) errors[name] = "Add a year and month, like 2024-03.";
    else if (value && !DATE.test(value)) errors[name] = "Use a year and month, like 2024-03.";
  };
  if (unit.kind === "experience") {
    needDate("start", true);
    needDate("end", false);
    if (!get("role") && !get("employer")) errors.role = "Add a job title or an employer.";
    const bullets = get("bullets")
      .split("\n")
      .filter((b) => b.trim());
    if (bullets.length > 12) errors.bullets = "A job can hold 12 lines. Remove some.";
    else if (bullets.some((b) => b.length > 300))
      errors.bullets = "Each line can be 300 characters.";
  }
  if (unit.kind === "education") {
    needDate("start", false);
    needDate("end", false);
    if (!get("qualification") && !get("institution"))
      errors.qualification = "Add a qualification or a school.";
  }
  if (unit.kind === "certification") {
    needDate("date", false);
    if (!get("name")) errors.name = "Add the name of the certification.";
  }
  if (unit.kind === "link" && !/^https?:\/\/\S+$/i.test(get("url"))) {
    errors.url = "Start the address with https://";
  }
  if (unit.kind === "skills") {
    const items = get("items")
      .split("\n")
      .filter((i) => i.trim());
    if (items.length > 40) errors.items = "You can keep 40 skills. Remove some.";
  }
  return errors;
}

export function draftHasErrors(units: readonly DraftUnit[]): boolean {
  return units.some((u) => u.accepted && Object.keys(unitErrors(u)).length > 0);
}

export type ApplyResult = { ok: true; cv: Cv } | { ok: false };

/** Copies accepted units onto a new, empty CV. Caps are enforced again by the schema. */
export function applyDraft(base: Cv, units: readonly DraftUnit[], title: string): ApplyResult {
  const cv: Cv = {
    ...base,
    title: cleanValue(title, 120),
    contact: { ...base.contact, links: [] },
    experience: [],
    education: [],
    skills: [],
    impact: [],
    certifications: [],
    references: [],
  };
  let n = 0;
  for (const unit of units) {
    if (!unit.accepted) continue;
    const get = (name: string): string =>
      cleanValue(unit.fields.find((f) => f.name === name)?.value ?? "", 5000, true);
    const one = (name: string): string => get(name).replace(/\s*\n\s*/g, " ");
    const listOf = (name: string): string[] =>
      get(name)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    n += 1;
    const id = `imp-${n}`;
    switch (unit.kind) {
      case "name":
        cv.contact.fullName = one("value");
        break;
      case "email":
        cv.contact.email = one("value");
        break;
      case "phone":
        cv.contact.phone = one("value");
        break;
      case "city":
        cv.contact.city = one("value");
        break;
      case "link":
        cv.contact.links.push({ label: one("label"), url: one("url") });
        break;
      case "summary":
        cv.summary = get("value");
        break;
      case "experience":
        cv.experience.push({
          id,
          role: one("role"),
          employer: one("employer"),
          location: one("location"),
          start: one("start"),
          end: one("end") || null,
          bullets: listOf("bullets"),
        });
        break;
      case "education":
        cv.education.push({
          id,
          qualification: one("qualification"),
          institution: one("institution"),
          start: one("start") || null,
          end: one("end") || null,
          details: get("details"),
        });
        break;
      case "skills":
        cv.skills.push({ id, label: "Skills", items: listOf("items") });
        break;
      case "impact":
        cv.impact.push(one("value"));
        break;
      case "certification":
        cv.certifications.push({
          id,
          name: one("name"),
          issuer: one("issuer"),
          date: one("date") || null,
        });
        break;
      case "interests":
        cv.interests = one("value");
        break;
      case "reference":
        cv.references.push({
          id,
          name: one("name"),
          role: one("role"),
          contact: one("contact"),
        });
        break;
    }
  }
  const checked = cvSchema.safeParse(cv);
  return checked.success ? { ok: true, cv: checked.data } : { ok: false };
}
