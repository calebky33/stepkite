import type { CvRules } from "./types";

/**
 * India CV rules.
 * verified stays false: guidance gives no single date format string, so dateFormat is null.
 *
 * Guidance disagrees on photo and personal details (older biodata habits against current
 * private sector advice), so the photo is unknown and date of birth, nationality and marital
 * status stay off.
 */
export const inCvRules: CvRules = {
  country: "in",
  verified: false,
  // Guidance only, not a hard cap: fresher resumes are usually one page, experienced ones two.
  maxPages: 2,
  photo: "unknown",
  dateFormat: null,
  allowDateOfBirth: false,
  allowNationality: false,
  allowMaritalStatus: false,
  documentName: "CV",
  paper: "A4",
  spelling: "en-IN",
  sources: [],
};
