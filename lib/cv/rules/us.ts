import type { CvRules } from "./types";

/**
 * US resume rules.
 * verified stays false: guidance gives no single date format string, so dateFormat is null.
 *
 * Section order: contact details, summary, experience, education, skills.
 * Reverse chronological order. Contact details: name, phone, email, city and state,
 * optional LinkedIn link.
 */
export const usCvRules: CvRules = {
  country: "us",
  verified: false,
  // Guidance only, not a hard cap: nothing truncates or blocks a longer resume.
  maxPages: 1,
  photo: "avoid",
  // Month and year, written the same way throughout. No format string is set yet.
  dateFormat: null,
  allowDateOfBirth: false,
  allowNationality: false,
  allowMaritalStatus: false,
  documentName: "Resume",
  paper: "Letter",
  spelling: "en-US",
  sources: [],
};
