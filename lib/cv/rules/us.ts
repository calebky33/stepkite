import type { CvRules } from "./types";

/** Structure only. The cv-template skill researches and fills the open values with sources. */
export const usCvRules: CvRules = {
  country: "us",
  verified: false,
  maxPages: null,
  photo: "unknown",
  dateFormat: null,
  allowDateOfBirth: false,
  allowNationality: false,
  allowMaritalStatus: false,
  documentName: "résumé",
  paper: "Letter",
  spelling: "en-US",
  sources: [],
};
