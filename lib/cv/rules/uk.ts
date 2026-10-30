import type { CvRules } from "./types";

/**
 * UK CV rules.
 * verified stays false: no exact date format string is fixed yet.
 *
 * Section order: contact details, personal statement, work experience, education, skills,
 * interests and references only if the user has them. Reverse chronological order.
 * Contact details: name, phone, email, optional LinkedIn link.
 */
export const ukCvRules: CvRules = {
  country: "uk",
  verified: false,
  // Guidance only, not a hard cap: nothing truncates or blocks a longer CV.
  maxPages: 2,
  photo: "avoid",
  // Month and year, written the same way throughout. No format string is set yet.
  dateFormat: null,
  allowDateOfBirth: false,
  allowNationality: false,
  allowMaritalStatus: false,
  documentName: "CV",
  paper: "A4",
  spelling: "en-GB",
  sources: [],
};
