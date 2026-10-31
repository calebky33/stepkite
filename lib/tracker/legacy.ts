/**
 * The one map from the old fixed stage names to stage record ids. migrate.ts and csv.ts
 * both use it, so "closed" always means the Rejected stage.
 */
const LEGACY_STAGE_IDS: ReadonlyMap<string, string> = new Map([
  ["saved", "stage-saved"],
  ["applied", "stage-applied"],
  ["interview", "stage-interview"],
  ["offer", "stage-offer"],
  ["closed", "stage-rejected"],
]);

/** The stage id for an old stage name, ignoring case. Undefined for unknown values. */
export function legacyStageId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return LEGACY_STAGE_IDS.get(value.trim().toLowerCase());
}

export const SAVED_STAGE_ID = "stage-saved";
