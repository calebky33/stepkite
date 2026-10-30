import { asciiDigits } from "./sanitize";

/**
 * Rules based CV text parser. Pure and deterministic: no network, no AI, no guessing at numbers.
 * Every line of text in the result is copied from the input. The only values it builds are
 * the year and month fields, and any month that was not in the file is flagged as approximate.
 */

export type ImportField = "summary" | "experience" | "techStack" | "impact" | "education";
export type Confidence = "high" | "low" | "none";

export type ParsedJob = {
  role: string;
  employer: string;
  location: string;
  /** Year and month, like 2024-03. */
  start: string;
  end: string | null;
  bullets: string[];
  /** True when the file had a year but no month, so a month was filled in. */
  approximateDates: boolean;
};

export type ParsedSchool = {
  qualification: string;
  institution: string;
  start: string | null;
  end: string | null;
  details: string;
  approximateDates: boolean;
};

export type ParsedCv = {
  summary: string;
  experience: ParsedJob[];
  education: ParsedSchool[];
  techStack: string[];
  /** Lines from the achievements section that already contain a number. Copied as written. */
  impact: string[];
  /** Lines from the achievements section left out because they have no number or are too long. */
  skippedImpact: string[];
  /** Text from a recognised section that could not be placed. Shown so nothing is lost. */
  unplaced: string[];
  confidence: Record<ImportField, Confidence>;
  warnings: string[];
};

export const LIMITS = {
  summary: 4000,
  short: 120,
  bullet: 300,
  bullets: 12,
  details: 500,
  jobs: 20,
  schools: 10,
  skills: 40,
  impact: 12,
} as const;

export type Line = { text: string; bullet: boolean };
export type SectionId = "summary" | "experience" | "education" | "techStack" | "impact";

export const HEADINGS: Record<string, SectionId | "other"> = {
  summary: "summary",
  "professional summary": "summary",
  "career summary": "summary",
  profile: "summary",
  "personal profile": "summary",
  "professional profile": "summary",
  "about me": "summary",
  objective: "summary",
  "career objective": "summary",
  "personal statement": "summary",
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  employment: "experience",
  "employment history": "experience",
  "work history": "experience",
  "career history": "experience",
  education: "education",
  "education and training": "education",
  qualifications: "education",
  "academic background": "education",
  skills: "techStack",
  "technical skills": "techStack",
  "key skills": "techStack",
  "core skills": "techStack",
  "core competencies": "techStack",
  "tech stack": "techStack",
  technologies: "techStack",
  "skills and tools": "techStack",
  "skills and technologies": "techStack",
  tools: "techStack",
  achievements: "impact",
  "key achievements": "impact",
  "selected achievements": "impact",
  accomplishments: "impact",
  "key accomplishments": "impact",
  impact: "impact",
  "quantified impact": "impact",
  references: "other",
  interests: "other",
  hobbies: "other",
  languages: "other",
  certifications: "other",
  projects: "other",
  awards: "other",
  publications: "other",
  volunteering: "other",
  courses: "other",
  "additional information": "other",
  "personal details": "other",
  contact: "other",
  declaration: "other",
};

const BULLET_MARK = /^[•●▪▫◦·‣⁃■□▶►➢✓✔*–—-]\s+/;

export function toLines(text: string): Line[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((raw) => {
      const spaced = raw.replace(/[\s ]+/g, " ").trim();
      const mark = BULLET_MARK.test(spaced);
      return { text: mark ? spaced.replace(BULLET_MARK, "").trim() : spaced, bullet: mark };
    });
}

/** The normalised heading text when the line is a known heading, like "work experience". */
export function headingName(line: Line): string | null {
  if (line.bullet) return null;
  const trimmed = line.text.replace(/[:：]\s*$/, "").trim();
  if (!trimmed || trimmed.length > 40) return null;
  const key = trimmed
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return key in HEADINGS ? key : null;
}

export function headingOf(line: Line): SectionId | "other" | null {
  const name = headingName(line);
  return name ? (HEADINGS[name] ?? null) : null;
}

const MONTH_NAMES = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MON =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const YEAR = "(?:19|20)\\d{2}";
const TOKEN = `(?:${MON}\\.?,?\\s+${YEAR}|\\d{1,2}\\s*[/.-]\\s*${YEAR}|${YEAR}\\s*[/.-]\\s*\\d{1,2}|${YEAR})`;
const NOW = "(?:present|current|currently|now|ongoing|till date|to date|today)";
const SEP = "\\s*(?:-|\\u2013|\\u2014|to|until|till)\\s*";
const RANGE = new RegExp(`(?<![\\w])(${TOKEN})${SEP}(${TOKEN}|${NOW})(?![\\w])`, "i");
const SINGLE = new RegExp(`(?<![\\w/.-])(${YEAR})(?![\\w/-])`);

type Moment = { year: number; month: number | null };

function parseToken(raw: string): Moment | null {
  const token = raw.trim();
  const named = new RegExp(`^(${MON})[a-z]*\\.?,?\\s+(${YEAR})$`, "i").exec(token);
  if (named?.[1] && named[2]) {
    const month = MONTH_NAMES.indexOf(named[1].slice(0, 3).toLowerCase()) + 1;
    return { year: Number(named[2]), month: month > 0 ? month : null };
  }
  const monthFirst = new RegExp(`^(\\d{1,2})\\s*[/.-]\\s*(${YEAR})$`).exec(token);
  if (monthFirst?.[1] && monthFirst[2]) {
    const month = Number(monthFirst[1]);
    return { year: Number(monthFirst[2]), month: month >= 1 && month <= 12 ? month : null };
  }
  const yearFirst = new RegExp(`^(${YEAR})\\s*[/.-]\\s*(\\d{1,2})$`).exec(token);
  if (yearFirst?.[1] && yearFirst[2]) {
    const month = Number(yearFirst[2]);
    return { year: Number(yearFirst[1]), month: month >= 1 && month <= 12 ? month : null };
  }
  const yearOnly = new RegExp(`^(${YEAR})$`).exec(token);
  if (yearOnly?.[1]) return { year: Number(yearOnly[1]), month: null };
  return null;
}

function monthYear(moment: Moment, fallbackMonth: number): string {
  return `${moment.year}-${String(moment.month ?? fallbackMonth).padStart(2, "0")}`;
}

type Dated = {
  start: string | null;
  end: string | null;
  approximate: boolean;
  /** The line with the date removed. */
  rest: string;
};

function tidy(text: string): string {
  return text.replace(/^[\s,|;:()[\]–—-]+|[\s,|;:()[\]–—-]+$/g, "").trim();
}

function findDate(original: string, allowSingleYear: boolean): Dated | null {
  const text = asciiDigits(original);
  const range = RANGE.exec(text);
  if (range?.[1] && range[2]) {
    const from = parseToken(range[1]);
    if (from) {
      const open = new RegExp(`^${NOW}$`, "i").test(range[2].trim());
      const to = open ? null : parseToken(range[2]);
      if (open || to) {
        const rest = tidy(text.replace(range[0], " ").replace(/\s+/g, " "));
        return {
          start: monthYear(from, 1),
          end: to ? monthYear(to, 12) : null,
          approximate: from.month === null || (to !== null && to.month === null),
          rest,
        };
      }
    }
  }
  if (allowSingleYear) {
    const single = SINGLE.exec(text);
    if (single?.[1]) {
      const rest = tidy(text.replace(single[0], " ").replace(/\s+/g, " "));
      return { start: null, end: `${single[1]}-12`, approximate: true, rest };
    }
  }
  return null;
}

/** Splits at sentence ends, then spaces, so a long line becomes lines no longer than max. */
function fitLine(text: string, max: number): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    const sentence = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("? "),
      window.lastIndexOf("! "),
    );
    let cut = sentence > 0 ? sentence + 1 : window.lastIndexOf(" ");
    if (cut <= 0) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Cuts at a space so a word or number is never split. */
function clip(text: string, max: number): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false };
  const window = text.slice(0, max + 1);
  const space = window.lastIndexOf(" ");
  return { text: text.slice(0, space > 0 ? space : max).trim(), cut: true };
}

/** Wrapped lines join onto the bullet above when the section uses bullet marks. */
function groupLines(lines: readonly Line[]): string[] {
  const marked = lines.some((l) => l.bullet);
  const out: string[] = [];
  let previousBlank = true;
  for (const line of lines) {
    if (!line.text) {
      previousBlank = true;
      continue;
    }
    const last = out[out.length - 1];
    const continues =
      marked && !line.bullet && !previousBlank && last !== undefined && !/[.!?]$/.test(last);
    if (continues) out[out.length - 1] = `${last} ${line.text}`;
    else out.push(line.text);
    previousBlank = false;
  }
  return out;
}

function splitParts(line: string): string[] {
  return line
    .split(/\s+at\s+|\s*[|•·]\s*|,\s+|\s+[-–—]\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

type Entry = { title: string[]; dated: Dated; body: Line[] };

/** Entries start at a line with a date. The one or two title lines above it belong to it. */
function splitEntries(
  lines: readonly Line[],
  allowSingleYear: boolean,
  unplaced: string[],
): Entry[] {
  const anchors: { index: number; dated: Dated }[] = [];
  lines.forEach((line, index) => {
    if (!line.text || line.bullet) return;
    const dated = findDate(line.text, allowSingleYear);
    if (dated && dated.rest.length <= 90) anchors.push({ index, dated });
  });
  const starts = anchors.map((anchor, k) => {
    const floor = k === 0 ? -1 : (anchors[k - 1]?.index ?? -1);
    const maxBack = anchor.dated.rest ? 1 : 2;
    let first = anchor.index;
    for (let back = 0; back < maxBack; back++) {
      const above = lines[first - 1];
      if (first - 1 <= floor || !above || !above.text || above.bullet) break;
      if (above.text.length > 80 || /[.!?]$/.test(above.text)) break;
      first -= 1;
    }
    return first;
  });
  const entries: Entry[] = [];
  anchors.forEach((anchor, k) => {
    const first = starts[k] ?? anchor.index;
    const next = starts[k + 1] ?? lines.length;
    const above = lines.slice(first, anchor.index).map((l) => l.text);
    const title = anchor.dated.rest ? [...above, anchor.dated.rest] : above;
    entries.push({ title, dated: anchor.dated, body: lines.slice(anchor.index + 1, next) });
  });
  const firstStart = starts[0] ?? lines.length;
  for (const line of lines.slice(0, firstStart)) if (line.text) unplaced.push(line.text);
  return entries;
}

function summaryOf(lines: readonly Line[], warnings: string[]): string {
  const paragraphs: string[] = [];
  let open = false;
  for (const line of lines) {
    if (!line.text) {
      open = false;
      continue;
    }
    const last = paragraphs[paragraphs.length - 1];
    if (open && last !== undefined) paragraphs[paragraphs.length - 1] = `${last} ${line.text}`;
    else paragraphs.push(line.text);
    open = true;
  }
  const clipped = clip(paragraphs.join("\n"), LIMITS.summary);
  if (clipped.cut)
    warnings.push("The summary was longer than 4000 characters, so the end was left out.");
  return clipped.text;
}

function jobsOf(lines: readonly Line[], warnings: string[], unplaced: string[]): ParsedJob[] {
  const jobs: ParsedJob[] = [];
  const entries = splitEntries(lines, false, unplaced);
  if (entries.length === 0) {
    for (const line of lines) if (line.text) unplaced.push(line.text);
    return jobs;
  }
  let cutBullets = 0;
  for (const entry of entries) {
    if (!entry.dated.start) continue;
    const parts = entry.title.flatMap(splitParts);
    const bullets = groupLines(entry.body).flatMap((b) => fitLine(b, LIMITS.bullet));
    if (bullets.length > LIMITS.bullets) cutBullets += bullets.length - LIMITS.bullets;
    const field = (value: string | undefined): string => clip(value ?? "", LIMITS.short).text;
    jobs.push({
      role: field(parts[0]),
      employer: field(parts[1]),
      location: field(parts.slice(2).join(", ")),
      start: entry.dated.start,
      end: entry.dated.end,
      bullets: bullets.slice(0, LIMITS.bullets),
      approximateDates: entry.dated.approximate,
    });
  }
  if (cutBullets > 0) {
    warnings.push(`${cutBullets} job lines were left out because a job can hold 12 lines.`);
  }
  if (jobs.length > LIMITS.jobs) {
    warnings.push("Only the first 20 jobs were kept.");
    jobs.length = LIMITS.jobs;
  }
  return jobs;
}

function schoolsOf(lines: readonly Line[], warnings: string[], unplaced: string[]): ParsedSchool[] {
  let entries = splitEntries(lines, true, unplaced);
  if (entries.length === 0) {
    // No dates: each block of lines between blank lines is one entry.
    const blocks: Line[][] = [];
    let current: Line[] = [];
    for (const line of lines) {
      if (!line.text) {
        if (current.length) blocks.push(current);
        current = [];
      } else current.push(line);
    }
    if (current.length) blocks.push(current);
    unplaced.length = 0;
    entries = blocks.map((block) => ({
      title: block[0] ? [block[0].text] : [],
      dated: { start: null, end: null, approximate: false, rest: "" },
      body: block.slice(1),
    }));
  }
  const schools: ParsedSchool[] = [];
  for (const entry of entries) {
    const parts = entry.title.flatMap(splitParts);
    const details = clip(
      entry.body
        .filter((l) => l.text)
        .map((l) => l.text)
        .join("\n"),
      LIMITS.details,
    );
    if (details.cut)
      warnings.push("Some education details were longer than 500 characters and were cut.");
    schools.push({
      qualification: clip(parts[0] ?? "", LIMITS.short).text,
      institution: clip(parts.slice(1).join(", "), LIMITS.short).text,
      start: entry.dated.start,
      end: entry.dated.end,
      details: details.text,
      approximateDates: entry.dated.approximate,
    });
  }
  if (schools.length > LIMITS.schools) {
    warnings.push("Only the first 10 education entries were kept.");
    schools.length = LIMITS.schools;
  }
  return schools;
}

function techStackOf(lines: readonly Line[], warnings: string[]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const line of lines) {
    if (!line.text) continue;
    const label = /^([^:,;|]{1,30}):\s+(.+)$/.exec(line.text);
    const body = label?.[2] ?? line.text;
    for (const piece of body.split(/\s*[,;|•·]\s*/)) {
      const item = clip(piece.trim(), LIMITS.short).text;
      const key = item.toLowerCase();
      if (item && !seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  }
  if (items.length > LIMITS.skills) {
    warnings.push("Only the first 40 tech stack items were kept.");
    items.length = LIMITS.skills;
  }
  return items;
}

/** Only a line that already has a digit in it can become an impact line. Nothing is computed. */
function impactOf(
  lines: readonly Line[],
  warnings: string[],
): { impact: string[]; skipped: string[] } {
  const impact: string[] = [];
  const skipped: string[] = [];
  for (const text of groupLines(lines)) {
    if (!/\p{Nd}/u.test(text) || text.length > LIMITS.bullet) {
      skipped.push(text);
    } else if (impact.length >= LIMITS.impact) {
      skipped.push(text);
    } else if (!impact.includes(text)) {
      impact.push(text);
    }
  }
  if (skipped.some((s) => /\p{Nd}/u.test(s))) {
    warnings.push(
      "Some achievement lines with numbers were left out because they were too long or over the limit of 12.",
    );
  }
  return { impact, skipped };
}

function rate(count: number, low: boolean): Confidence {
  if (count === 0) return "none";
  return low ? "low" : "high";
}

export function parseCvText(text: string): ParsedCv {
  const warnings: string[] = [];
  const unplaced: string[] = [];
  const sections: Record<SectionId, Line[]> = {
    summary: [],
    experience: [],
    education: [],
    techStack: [],
    impact: [],
  };
  let current: SectionId | "other" | null = null;
  for (const line of toLines(text)) {
    const heading = headingOf(line);
    if (heading) {
      current = heading;
      if (heading !== "other") sections[heading].push({ text: "", bullet: false });
      continue;
    }
    if (current && current !== "other") sections[current].push(line);
  }

  const summary = summaryOf(sections.summary, warnings);
  const experience = jobsOf(sections.experience, warnings, unplaced);
  const education = schoolsOf(sections.education, warnings, unplaced);
  const techStack = techStackOf(sections.techStack, warnings);
  const { impact, skipped } = impactOf(sections.impact, warnings);

  return {
    summary,
    experience,
    education,
    techStack,
    impact,
    skippedImpact: skipped,
    unplaced,
    confidence: {
      summary: summary ? "high" : "none",
      experience: rate(
        experience.length,
        experience.some((j) => !j.role || !j.employer || j.approximateDates),
      ),
      education: rate(
        education.length,
        education.some((s) => !s.qualification || !s.institution || s.approximateDates),
      ),
      techStack: rate(
        techStack.length,
        techStack.some((item) => item.split(" ").length > 4),
      ),
      impact: impact.length > 0 ? "high" : "none",
    },
    warnings,
  };
}
