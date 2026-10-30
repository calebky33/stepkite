import type { CvRules } from "./rules/types";
import { findGenericPhrases } from "./phrases";
import type { Cv } from "./schema";

/** Where the person goes to fix a flag. Each maps to an element id in the editor. */
export type AtsSection =
  | "contact"
  | "summary"
  | "experience"
  | "impact"
  | "education"
  | "skills"
  | "certifications"
  | "interests"
  | "references"
  | "layout";

export type AtsFlag = {
  id: string;
  message: string;
  section: AtsSection;
  /** The field to fix, in the words the editor uses. */
  field: string;
};

export type AtsReport = { flags: AtsFlag[]; passes: string[] };

export type AtsInput = {
  cv: Cv;
  rules: CvRules;
  /** Pages in the rendered preview. null when unknown or when the preview shows the example. */
  pageCount: number | null;
  /** The schema has no photo field yet. Kept so the rule works the day one is added. */
  hasPhoto?: boolean;
};

/** Bullets longer than this are hard to scan. The schema allows 300. */
export const LONG_BULLET_CHARS = 180;

const SECTION_NAME: Record<AtsSection, string> = {
  contact: "Contact",
  summary: "Summary",
  experience: "Experience",
  impact: "Quantified impact",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
  layout: "Template and layout",
};
export const atsSectionName = (section: AtsSection): string => SECTION_NAME[section];

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

type Spot = { section: AtsSection; where: string; text: string };

/** Every free text field a person wrote, with a plain name for where it is. */
function textSpots(cv: Cv): Spot[] {
  const spots: Spot[] = [];
  if (cv.summary) spots.push({ section: "summary", where: "your summary", text: cv.summary });
  cv.experience.forEach((job, i) =>
    job.bullets.forEach((bullet, b) =>
      spots.push({
        section: "experience",
        where: `experience entry ${i + 1}, bullet ${b + 1}`,
        text: bullet,
      }),
    ),
  );
  cv.impact.forEach((line, i) =>
    spots.push({ section: "impact", where: `quantified impact line ${i + 1}`, text: line }),
  );
  cv.education.forEach((item, i) =>
    spots.push({ section: "education", where: `education entry ${i + 1}`, text: item.details }),
  );
  if (cv.interests)
    spots.push({ section: "interests", where: "your interests", text: cv.interests });
  return spots;
}

function contactFlags(cv: Cv): AtsFlag[] {
  const c = cv.contact;
  const fields: [string, string, string][] = [
    [c.fullName, "contact-name", "Full name"],
    [c.email, "contact-email", "Email"],
    [c.phone, "contact-phone", "Phone"],
  ];
  return fields
    .filter(([value]) => !value.trim())
    .map(([, id, field]) => ({
      id,
      section: "contact" as const,
      field,
      message: `Add your ${field.toLowerCase()}. Employers and tracking systems look for it first.`,
    }));
}

function dateStyleFlags(cv: Cv): AtsFlag[] {
  const flags: AtsFlag[] = [];
  const eduStyles = new Set(cv.education.map((e) => `${e.start ? "s" : "-"}${e.end ? "e" : "-"}`));
  if (eduStyles.size > 1) {
    flags.push({
      id: "dates-education",
      section: "education",
      field: "Start and end dates",
      message:
        "Some education entries have both dates and others do not. Give each one the same dates so they read the same way.",
    });
  }
  const certStyles = new Set(cv.certifications.map((c) => (c.date ? "d" : "-")));
  if (certStyles.size > 1) {
    flags.push({
      id: "dates-certifications",
      section: "certifications",
      field: "Date",
      message:
        "Some certifications have a date and others do not. Add a date to each or remove them all.",
    });
  }
  const jobStyles = new Set(cv.experience.map((j) => (j.start ? "s" : "-")));
  if (jobStyles.size > 1) {
    flags.push({
      id: "dates-experience",
      section: "experience",
      field: "Start date",
      message: "Some jobs have no start date. Give every job a start date.",
    });
  }
  return flags;
}

function emptyEntryFlags(cv: Cv): AtsFlag[] {
  const flags: AtsFlag[] = [];
  const blankJobs = cv.experience.filter(
    (j) => !j.role.trim() && !j.employer.trim() && !j.bullets.some((b) => b.trim()),
  ).length;
  if (blankJobs) {
    flags.push({
      id: "empty-experience",
      section: "experience",
      field: "Role and employer",
      message: `${plural(blankJobs, "job is", "jobs are")} empty but still print under the Experience heading. Fill ${blankJobs === 1 ? "it" : "them"} in or remove ${blankJobs === 1 ? "it" : "them"}.`,
    });
  }
  const blankEdu = cv.education.filter(
    (e) => !e.qualification.trim() && !e.institution.trim(),
  ).length;
  if (blankEdu) {
    flags.push({
      id: "empty-education",
      section: "education",
      field: "Qualification",
      message: `${plural(blankEdu, "education entry is", "education entries are")} empty but still print under the Education heading. Fill ${blankEdu === 1 ? "it" : "them"} in or remove ${blankEdu === 1 ? "it" : "them"}.`,
    });
  }
  const blankSkills = cv.skills.filter((g) => g.label.trim() && g.items.length === 0).length;
  if (blankSkills) {
    flags.push({
      id: "empty-skills",
      section: "skills",
      field: "Skills in the group",
      message: `${plural(blankSkills, "skill group has", "skill groups have")} a name but no skills. Add skills or remove ${blankSkills === 1 ? "it" : "them"}.`,
    });
  }
  return flags;
}

/**
 * Checks a CV against the country rules and common applicant tracking habits.
 * Pure: the same input always gives the same report. Nothing here blocks anything.
 */
export function checkAts({ cv, rules, pageCount, hasPhoto = false }: AtsInput): AtsReport {
  const flags: AtsFlag[] = [];
  const passes: string[] = [];
  const doc = rules.documentName;

  if (rules.photo === "avoid") {
    if (hasPhoto) {
      flags.push({
        id: "photo",
        section: "layout",
        field: "Photo",
        message: `Employers in this country usually do not want a photo on a ${doc}. Remove it.`,
      });
    } else passes.push(`No photo, which suits a ${doc} for this country.`);
  }

  const contact = contactFlags(cv);
  flags.push(...contact);
  if (contact.length === 0) passes.push("Name, email and phone are all there.");

  if (rules.maxPages !== null && pageCount !== null) {
    if (pageCount > rules.maxPages) {
      flags.push({
        id: "pages",
        section: "layout",
        field: "Margins or text length",
        message: `Your ${doc} runs to ${plural(pageCount, "page", "pages")}. Guidance here is ${plural(rules.maxPages, "page", "pages")} or fewer. It is only a warning. You can still download it.`,
      });
    } else {
      passes.push(
        `Length is ${plural(pageCount, "page", "pages")}, within the ${rules.maxPages} page guide.`,
      );
    }
  }

  const dates = dateStyleFlags(cv);
  flags.push(...dates);
  if (dates.length === 0) passes.push("Dates are written the same way throughout.");

  const empty = emptyEntryFlags(cv);
  flags.push(...empty);
  if (empty.length === 0) passes.push("No empty sections with headings.");

  const spots = textSpots(cv);
  const longBullets = spots.filter(
    (s) =>
      (s.section === "experience" || s.section === "impact") && s.text.length > LONG_BULLET_CHARS,
  );
  longBullets.forEach((s) =>
    flags.push({
      id: `long-${s.where}`,
      section: s.section,
      field: "Bullet text",
      message: `The text in ${s.where} is ${s.text.length} characters. Split it or cut it to one clear line.`,
    }),
  );
  if (longBullets.length === 0) passes.push("No very long bullets.");

  let genericCount = 0;
  for (const s of spots) {
    for (const phrase of findGenericPhrases(s.text)) {
      genericCount += 1;
      flags.push({
        id: `phrase-${s.where}-${phrase}`,
        section: s.section,
        field: "Text",
        message: `"${phrase}" in ${s.where} is a stock phrase. Say what you did instead.`,
      });
    }
  }
  if (genericCount === 0) passes.push("No stock phrases found.");

  return { flags, passes };
}
