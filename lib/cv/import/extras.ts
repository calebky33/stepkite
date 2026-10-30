/**
 * Contact details, certifications, interests and references, plus every line that did not fit
 * anywhere. Rules only. Nothing is guessed: a value is kept only if it is text from the file.
 */
import { headingName, toLines, type Line } from "./parse";
import { asciiDigits } from "./sanitize";

export type ParsedContact = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  links: { label: string; url: string }[];
};
export type ParsedCert = { name: string; issuer: string; date: string | null };
export type ParsedRef = { name: string; role: string; contact: string };

export type Extras = {
  contact: ParsedContact;
  /** The name came from the first line of the file, which is a weaker signal than a label. */
  nameGuessed: boolean;
  certifications: ParsedCert[];
  interests: string;
  references: ParsedRef[];
  /** Lines from sections that have no field, and unused lines at the top of the file. */
  leftover: string[];
};

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/u;
const PHONE = /(?<![\w])(\+?\(?\d[\d\s().-]{7,17}\d)(?![\w])/;
const URL_LIKE =
  /\b((?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)\/[^\s,|;]+|https?:\/\/[^\s,|;]+)/i;
const MON =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function linkLabel(url: string): string {
  const host = /(?:https?:\/\/)?(?:www\.)?([^/\s]+)/i.exec(url)?.[1] ?? "";
  if (host.startsWith("linkedin")) return "LinkedIn";
  if (host.startsWith("github")) return "GitHub";
  return host.slice(0, 60) || "Link";
}

/** Only http and https links are kept. Anything else (javascript:, data:) is ignored. */
function safeUrl(raw: string): string | null {
  const trimmed = raw.replace(/[.,;)]+$/, "");
  const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function contactOf(
  head: readonly Line[],
  leftover: string[],
): { contact: ParsedContact; nameGuessed: boolean } {
  const contact: ParsedContact = { fullName: "", email: "", phone: "", city: "", links: [] };
  let nameGuessed = false;
  for (const line of head) {
    if (!line.text) continue;
    let rest = line.text;
    const email = EMAIL.exec(rest);
    if (email && !contact.email) contact.email = email[0];
    if (email) rest = rest.replace(email[0], " ");
    const url = URL_LIKE.exec(rest);
    if (url?.[1]) {
      const safe = safeUrl(url[1]);
      if (safe && contact.links.length < 6 && !contact.links.some((l) => l.url === safe)) {
        contact.links.push({ label: linkLabel(safe), url: safe });
      }
      rest = rest.replace(url[1], " ");
    }
    // asciiDigits keeps the length, so a match in the converted text maps to the same place.
    const digits = asciiDigits(rest);
    const phone = PHONE.exec(digits);
    if (phone?.[1]) {
      if (!contact.phone) contact.phone = rest.slice(phone.index, phone.index + phone[1].length);
      rest = `${rest.slice(0, phone.index)} ${rest.slice(phone.index + phone[1].length)}`;
    }
    const labelled = /^(address|location|city|based in)\s*[:：]\s*(.+)$/i.exec(rest.trim());
    if (labelled?.[2]) {
      if (!contact.city) contact.city = labelled[2].trim();
      else leftover.push(labelled[2].trim());
      continue;
    }
    const cleaned = rest
      .replace(/\b(email|e-mail|mobile|phone|tel|contact|linkedin|github)\b\s*[:：]?/gi, " ")
      .replace(/[|•·,;]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) continue;
    if (
      !contact.fullName &&
      cleaned.length <= 60 &&
      !cleaned.includes(":") &&
      !/\p{Nd}/u.test(cleaned)
    ) {
      contact.fullName = cleaned;
      nameGuessed = true;
    } else {
      leftover.push(cleaned);
    }
  }
  return { contact, nameGuessed };
}

function certDate(text: string): { date: string | null; rest: string } {
  const named = new RegExp(`\\b(${MON})[a-z]*\\.?,?\\s+((?:19|20)\\d{2})\\b`, "i").exec(text);
  if (named?.[1] && named[2]) {
    const month = MONTHS.indexOf(named[1].slice(0, 3).toLowerCase()) + 1;
    return {
      date: `${named[2]}-${String(month).padStart(2, "0")}`,
      rest: text.replace(named[0], " "),
    };
  }
  const numeric = /\b(0?[1-9]|1[0-2])\s*[/.-]\s*((?:19|20)\d{2})\b/.exec(text);
  if (numeric?.[1] && numeric[2]) {
    return {
      date: `${numeric[2]}-${numeric[1].padStart(2, "0")}`,
      rest: text.replace(numeric[0], " "),
    };
  }
  return { date: null, rest: text.replace(/\b(?:19|20)\d{2}\b/, " ") };
}

function certsOf(lines: readonly Line[]): ParsedCert[] {
  const certs: ParsedCert[] = [];
  for (const line of lines) {
    if (!line.text) continue;
    const { date, rest } = certDate(asciiDigits(line.text));
    const parts = rest
      .split(/\s+[-–—|]\s+|\s*[|,]\s*|\s+by\s+/i)
      .map((p) => p.replace(/^[\s()[\]]+|[\s()[\]]+$/g, "").trim())
      .filter(Boolean);
    const name = parts[0];
    if (name) certs.push({ name, issuer: parts.slice(1).join(", "), date });
  }
  return certs;
}

function refsOf(lines: readonly Line[], leftover: string[]): ParsedRef[] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line.text) {
      if (current.length) blocks.push(current);
      current = [];
    } else current.push(line.text);
  }
  if (current.length) blocks.push(current);
  const refs: ParsedRef[] = [];
  for (const block of blocks) {
    const joined = block.join(" ");
    if (block.length === 1 && /\b(on request|upon request|available)\b/i.test(joined)) continue;
    const [name, role, ...contact] = block;
    if (block.length >= 2 && name) {
      refs.push({ name, role: role ?? "", contact: contact.join(", ") });
    } else leftover.push(joined);
  }
  return refs;
}

/** Headings the main parser already reads. Their text is not repeated in the leftover list. */
const PLACED = new Set([
  "summary",
  "professional summary",
  "career summary",
  "profile",
  "personal profile",
  "professional profile",
  "about me",
  "objective",
  "career objective",
  "personal statement",
  "experience",
  "work experience",
  "professional experience",
  "relevant experience",
  "employment",
  "employment history",
  "work history",
  "career history",
  "education",
  "education and training",
  "qualifications",
  "academic background",
  "skills",
  "technical skills",
  "key skills",
  "core skills",
  "core competencies",
  "tech stack",
  "technologies",
  "skills and tools",
  "skills and technologies",
  "tools",
  "achievements",
  "key achievements",
  "selected achievements",
  "accomplishments",
  "key accomplishments",
  "impact",
  "quantified impact",
]);

type Mode = "head" | "certs" | "refs" | "interests" | "contact" | "skip" | "other";

export function parseExtras(text: string): Extras {
  const leftover: string[] = [];
  const head: Line[] = [];
  const certLines: Line[] = [];
  const refLines: Line[] = [];
  const contactLines: Line[] = [];
  const interestLines: string[] = [];
  let mode: Mode = "head";
  let otherName = "";
  for (const line of toLines(text)) {
    const name = headingName(line);
    if (name) {
      if (name === "certifications") mode = "certs";
      else if (name === "references") mode = "refs";
      else if (name === "interests" || name === "hobbies") mode = "interests";
      else if (name === "contact" || name === "personal details") mode = "contact";
      else if (PLACED.has(name)) mode = "skip";
      else {
        mode = "other";
        otherName = name;
      }
      continue;
    }
    if (mode === "head") head.push(line);
    else if (mode === "certs") certLines.push(line);
    else if (mode === "refs") refLines.push(line);
    else if (mode === "contact") contactLines.push(line);
    else if (mode === "interests") {
      if (line.text) interestLines.push(line.text);
    } else if (mode === "other" && line.text) leftover.push(`${otherName}: ${line.text}`);
  }
  const { contact, nameGuessed } = contactOf([...head, ...contactLines], leftover);
  return {
    contact,
    nameGuessed,
    certifications: certsOf(certLines),
    interests: interestLines.join(", "),
    references: refsOf(refLines, leftover),
    leftover,
  };
}
