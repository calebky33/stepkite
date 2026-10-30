import { z } from "zod";
import { storedCvSchema } from "./schema";

export const SNAPSHOT_LIMIT = 10;
export const SNAPSHOT_EVERY_MS = 5 * 60 * 1000;

export const snapshotSchema = z.object({
  /** Same id as the CV the copies belong to. */
  id: z.string().min(1).max(64),
  copies: z
    .array(z.object({ at: z.number().int().nonnegative(), cv: storedCvSchema }))
    .max(SNAPSHOT_LIMIT),
});
export type SnapshotSet = z.infer<typeof snapshotSchema>;
export type SnapshotCopy = SnapshotSet["copies"][number];

/** One copy per five minutes of editing, oldest dropped after ten. Returns the same set when it is too soon. */
export function addSnapshot(set: SnapshotSet, copy: SnapshotCopy): SnapshotSet {
  const last = set.copies[set.copies.length - 1];
  if (last && copy.at - last.at < SNAPSHOT_EVERY_MS) return set;
  return { ...set, copies: [...set.copies, copy].slice(-SNAPSHOT_LIMIT) };
}
