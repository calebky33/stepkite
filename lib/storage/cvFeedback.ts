import { z } from "zod";
import { writeItem, type StorageResult } from "./db";

const answerSchema = z.object({
  id: z.string().min(1).max(100),
  cvId: z.string().min(1).max(64),
  answer: z.enum(["yes", "no"]),
  at: z.iso.datetime(),
});

/** "Did this work for your application?" Stays on the device. Nothing here uses the network. */
export function saveDownloadAnswer(
  cvId: string,
  answer: "yes" | "no",
  now: Date,
): Promise<StorageResult<null>> {
  const at = now.toISOString();
  const id = `${cvId}-${at}`;
  return writeItem("cv-feedback", id, answerSchema, { id, cvId, answer, at });
}
