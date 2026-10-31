/** The single list of device storage collections. db.ts and memoryDb.ts both re-export it. */
export type Collection =
  | "cvs"
  | "jobs"
  | "cv-snapshots"
  | "cv-bin"
  | "cv-feedback"
  | "tracker-activity"
  | "tracker-interviews"
  | "tracker-contacts"
  | "tracker-stages"
  | "tracker-quarantine";

export const COLLECTIONS: readonly Collection[] = [
  "cvs",
  "jobs",
  "cv-snapshots",
  "cv-bin",
  "cv-feedback",
  "tracker-activity",
  "tracker-interviews",
  "tracker-contacts",
  "tracker-stages",
  "tracker-quarantine",
];

export type StorageFailure = {
  ok: false;
  /** unavailable: no storage here. error: storage exists but the call failed. */
  reason: "unavailable" | "invalid" | "missing" | "full" | "error";
  /** The error's name only, never its message or any stored data. */
  cause?: string;
  /** clearEverything only: collections that still hold data. */
  remaining?: Collection[];
};

export type StorageResult<T> = { ok: true; value: T } | StorageFailure;

export type ReadAllValue<T> = {
  items: T[];
  skipped: number;
  /** The raw values that failed the schema, so a backup can still carry them. */
  skippedValues: unknown[];
};

/** Maps a thrown error to a failure. Only the error name is kept. */
export function failureFrom(error: unknown): StorageFailure {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : "UnknownError";
  if (name === "QuotaExceededError") return { ok: false, reason: "full" };
  return { ok: false, reason: "error", cause: name };
}
