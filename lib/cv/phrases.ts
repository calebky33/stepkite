/**
 * Phrases the ATS check flags as generic. Mirrors the banned list in docs/VOICE.md for CV text.
 * The list is matched case-insensitively on word starts.
 */
export const GENERIC_CV_PHRASES: readonly string[] = [
  "results-driven",
  "team player",
  "go-getter",
  "self-starter",
  "dynamic professional",
  "passionate about",
  "proven track record",
  "think outside the box",
  "detail-oriented",
  "responsible for",
  "synergy",
  "leverage",
  "spearheaded",
  "hard working",
  "hardworking",
  "highly motivated",
  "motivated individual",
  "strong work ethic",
  "fast learner",
  "quick learner",
  "excellent communication skills",
  "excellent interpersonal skills",
  "good communicator",
  "results oriented",
  "seasoned professional",
  "extensive experience",
  "hit the ground running",
  "wear many hats",
  "fast paced environment",
  "cutting edge",
  "value add",
  "utilise",
  "utilize",
];

export function findGenericPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  return GENERIC_CV_PHRASES.filter((phrase) => lower.includes(phrase));
}
