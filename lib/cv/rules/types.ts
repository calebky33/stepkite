import type { CountryCode } from "@/lib/countries";

/**
 * Country rules decide what the editor shows and what the ATS check flags.
 * Values start as "unverified" and are filled by the cv-template skill from official or
 * university careers service guidance, with a source URL for each.
 */
export interface CvRules {
  country: CountryCode;
  verified: boolean;
  /** Pages above this are flagged. null until researched. */
  maxPages: number | null;
  photo: "expected" | "avoid" | "unknown";
  dateFormat: string | null;
  allowDateOfBirth: boolean;
  allowNationality: boolean;
  allowMaritalStatus: boolean;
  documentName: string;
  paper: "A4" | "Letter";
  spelling: "en-GB" | "en-US" | "en-IN";
  sources: readonly string[];
}
