import type { CvRules } from "./types";

/** Structure only. The cv-template skill researches and fills the open values with sources. */
export const ukCvRules: CvRules = {
  country: "uk",
  verified: false,
  maxPages: null,
  photo: "unknown",
  dateFormat: null,
  allowDateOfBirth: false,
  allowNationality: false,
  allowMaritalStatus: false,
  documentName: "CV",
  paper: "A4",
  spelling: "en-GB",
  sources: [],
};
