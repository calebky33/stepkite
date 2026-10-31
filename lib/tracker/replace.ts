import { z } from "zod";
import {
  listIds,
  readRawEntries,
  removeItem,
  writeItem,
  type Collection,
  type StorageFailure,
  type StorageResult,
} from "@/lib/storage/db";
import type { TrackerData } from "./backup";
import { migrateJobResult } from "./migrate";
import { activitySchema, contactSchema, interviewSchema, jobSchema, stageSchema } from "./schema";

/** Reads a stored job in either shape. Rows that cannot be migrated count as unreadable. */
const storedJob = z.unknown().transform((raw, ctx) => {
  const r = migrateJobResult(raw);
  if (!r.ok) {
    ctx.addIssue({ code: "custom", message: "unreadable" });
    return z.NEVER;
  }
  return r.job;
});

export type TrackerCounts = {
  jobs: number;
  stages: number;
  activities: number;
  interviews: number;
  contacts: number;
};

export type WriteFailure = {
  collection: Collection;
  /** The item id. Ids are random and carry no personal data. */
  id: string;
  reason: StorageFailure["reason"];
};

const ZERO: TrackerCounts = { jobs: 0, stages: 0, activities: 0, interviews: 0, contacts: 0 };

type Spec = {
  collection: Collection;
  /** Decides whether a stored row is readable. */
  readSchema: z.ZodType<unknown>;
  count: keyof TrackerCounts;
  /** The incoming rows, each with a writer that validates against the write schema. */
  incoming: (data: TrackerData) => { id: string; write: () => Promise<StorageResult<null>> }[];
};

function spec<K extends keyof TrackerData>(
  key: K,
  collection: Collection,
  readSchema: z.ZodType<unknown>,
  writeSchema: z.ZodType<TrackerData[K][number]>,
): Spec {
  return {
    collection,
    readSchema,
    count: key,
    incoming: (data) =>
      data[key].map((item: TrackerData[K][number]) => ({
        id: item.id,
        write: () => writeItem(collection, item.id, writeSchema, item),
      })),
  };
}

const SPECS: readonly Spec[] = [
  spec("jobs", "jobs", storedJob, jobSchema),
  spec("stages", "tracker-stages", stageSchema, stageSchema),
  spec("activities", "tracker-activity", activitySchema, activitySchema),
  spec("interviews", "tracker-interviews", interviewSchema, interviewSchema),
  spec("contacts", "tracker-contacts", contactSchema, contactSchema),
];

const WRITE_CHUNK = 100;
const rawSchema = z.unknown();

/** Writes every item and checks every result. Nothing is deleted. */
export async function writeTrackerData(
  data: TrackerData,
): Promise<{ written: TrackerCounts; failed: WriteFailure[] }> {
  const written: TrackerCounts = { ...ZERO };
  const failed: WriteFailure[] = [];
  for (const sp of SPECS) {
    const rows = sp.incoming(data);
    for (let i = 0; i < rows.length; i += WRITE_CHUNK) {
      const chunk = rows.slice(i, i + WRITE_CHUNK);
      const results = await Promise.all(chunk.map((row) => row.write()));
      results.forEach((r, j) => {
        if (r.ok) written[sp.count] += 1;
        else failed.push({ collection: sp.collection, id: chunk[j]?.id ?? "", reason: r.reason });
      });
    }
  }
  return { written, failed };
}

/** What a failed rollback or cleanup left behind. Counts only, never values. */
export type LeftoverCounts = Partial<
  Record<
    Collection,
    {
      /** New rows that could not be removed. */
      notRemoved: number;
      /** Earlier rows that could not be put back. */
      notRestored: number;
      /** True when the collection could not even be listed. */
      unchecked: boolean;
    }
  >
>;

export type ReplaceResult =
  | { ok: true; written: TrackerCounts; removed: number; leftUnreadable: number }
  | {
      ok: false;
      reason: StorageFailure["reason"] | "id-collision";
      failed: WriteFailure[];
      written: TrackerCounts;
      /** True when the earlier data was put back. */
      restored: boolean;
      /** Set when restored is false after a rollback: what is still out of place. */
      leftover?: LeftoverCounts;
    };

/**
 * Replaces the stored tracker data with `data`. New data is written first and every result is
 * checked. Only then are stale keys removed. If anything fails the earlier rows are put back
 * byte for byte. Rows the app cannot read are never deleted. Incoming ids that match an
 * unreadable row are refused before any write (reason "id-collision", ids in `failed`).
 */
export async function replaceTrackerData(data: TrackerData): Promise<ReplaceResult> {
  const before = new Map<Collection, { id: string; raw: unknown }[]>();
  let leftUnreadable = 0;
  const collisions: WriteFailure[] = [];
  for (const sp of SPECS) {
    const r = await readRawEntries(sp.collection);
    if (!r.ok)
      return { ok: false, reason: r.reason, failed: [], written: { ...ZERO }, restored: false };
    const readable: { id: string; raw: unknown }[] = [];
    const unreadable = new Set<string>();
    for (const row of r.value) {
      if (sp.readSchema.safeParse(row.raw).success) readable.push(row);
      else unreadable.add(row.id);
    }
    before.set(sp.collection, readable);
    leftUnreadable += unreadable.size;
    for (const row of sp.incoming(data)) {
      if (unreadable.has(row.id))
        collisions.push({ collection: sp.collection, id: row.id, reason: "invalid" });
    }
  }
  if (collisions.length > 0) {
    return {
      ok: false,
      reason: "id-collision",
      failed: collisions,
      written: { ...ZERO },
      restored: false,
    };
  }

  const { written, failed } = await writeTrackerData(data);

  const rollback = async (): Promise<{ clean: boolean; leftover: LeftoverCounts }> => {
    const leftover: LeftoverCounts = {};
    for (const sp of SPECS) {
      const old = before.get(sp.collection) ?? [];
      const oldIds = new Set(old.map((o) => o.id));
      const newIds = new Set(sp.incoming(data).map((n) => n.id));
      const entry = { notRemoved: 0, notRestored: 0, unchecked: false };
      const ids = await listIds(sp.collection);
      if (!ids.ok) {
        entry.unchecked = true;
      } else {
        for (const id of ids.value) {
          if (oldIds.has(id) || !newIds.has(id)) continue;
          if (!(await removeItem(sp.collection, id)).ok) entry.notRemoved += 1;
        }
      }
      for (const row of old) {
        if (!(await writeItem(sp.collection, row.id, rawSchema, row.raw)).ok)
          entry.notRestored += 1;
      }
      if (entry.notRemoved > 0 || entry.notRestored > 0 || entry.unchecked)
        leftover[sp.collection] = entry;
    }
    return { clean: Object.keys(leftover).length === 0, leftover };
  };

  const failWith = async (list: WriteFailure[]): Promise<ReplaceResult> => {
    const rb = await rollback();
    return {
      ok: false,
      reason: list[0]?.reason ?? "error",
      failed: list,
      written,
      restored: rb.clean,
      ...(rb.clean ? {} : { leftover: rb.leftover }),
    };
  };

  if (failed.length > 0) return failWith(failed);

  const staleFailed: WriteFailure[] = [];
  let removed = 0;
  for (const sp of SPECS) {
    const keep = new Set(sp.incoming(data).map((n) => n.id));
    for (const old of before.get(sp.collection) ?? []) {
      if (keep.has(old.id)) continue;
      const r = await removeItem(sp.collection, old.id);
      if (r.ok) removed += 1;
      else staleFailed.push({ collection: sp.collection, id: old.id, reason: r.reason });
    }
  }
  if (staleFailed.length > 0) return failWith(staleFailed);
  return { ok: true, written, removed, leftUnreadable };
}
