import { z } from "zod";
import { listIds, writeItem, type StorageResult } from "@/lib/storage/db";

export const quarantineSchema = z.object({
  id: z.string().min(1).max(80),
  from: z.string().min(1).max(40),
  quarantinedAt: z.iso.datetime(),
  raw: z.unknown(),
});
export type QuarantineEntry = z.infer<typeof quarantineSchema>;

/** Most entries the quarantine holds. Anything past this is counted, not kept. */
export const QUARANTINE_MAX = 500;

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : 1)),
      );
    }
    return v;
  });
}

/** SHA-256 of a value's content as 64 hex characters. Key order does not matter. */
export async function contentHash(raw: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stable(raw) ?? "undefined");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Wraps unreadable rows with ids you supply. Prefer buildQuarantine, which hashes and caps. */
export function quarantineEntries(
  from: string,
  raws: readonly unknown[],
  now: string,
  newId: (index: number) => string,
): QuarantineEntry[] {
  return raws.map((raw, index) => ({
    id: `${from}-${newId(index)}`,
    from,
    quarantinedAt: now,
    raw,
  }));
}

/**
 * Wraps unreadable rows so they can be kept. The originals are never touched here. The id is
 * a SHA-256 content hash, so the same row is never stored twice. At most `max` entries are
 * returned; `dropped` counts the rest (and rows that repeat an earlier one are not dropped,
 * they are merged).
 */
export async function buildQuarantine(
  from: string,
  raws: readonly unknown[],
  now: string,
  max: number = QUARANTINE_MAX,
): Promise<{ entries: QuarantineEntry[]; dropped: number }> {
  const seen = new Set<string>();
  const entries: QuarantineEntry[] = [];
  let dropped = 0;
  for (const raw of raws) {
    const id = `${from}-${(await contentHash(raw)).slice(0, 40)}`;
    if (seen.has(id)) continue;
    if (entries.length >= max) {
      dropped += 1;
      continue;
    }
    seen.add(id);
    entries.push({ id, from, quarantinedAt: now, raw });
  }
  return { entries, dropped };
}

/**
 * Copies entries into the quarantine collection. It only writes. Original rows stay where they
 * are, so nothing is lost if this fails. Returns how many copies were saved, how many failed,
 * and how many were not kept because the quarantine already holds QUARANTINE_MAX entries.
 */
export async function saveQuarantine(
  entries: readonly QuarantineEntry[],
): Promise<{ saved: number; failed: number; dropped: number }> {
  let saved = 0;
  let failed = 0;
  let dropped = 0;
  const existing = await listIds("tracker-quarantine");
  const have = new Set(existing.ok ? existing.value : []);
  for (const entry of entries) {
    if (!have.has(entry.id) && have.size >= QUARANTINE_MAX) {
      dropped += 1;
      continue;
    }
    const r: StorageResult<null> = await writeItem(
      "tracker-quarantine",
      entry.id,
      quarantineSchema,
      entry,
    );
    if (r.ok) {
      saved += 1;
      have.add(entry.id);
    } else failed += 1;
  }
  return { saved, failed, dropped };
}
