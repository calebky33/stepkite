import type { Cv } from "./schema";

/** Test helper: what a CV looked like before certifications, interests and references. */
export function withoutNewSections(cv: Cv): Record<string, unknown> {
  const old: Record<string, unknown> = { ...cv };
  delete old.certifications;
  delete old.interests;
  delete old.references;
  return old;
}
