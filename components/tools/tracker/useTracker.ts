"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildTrackerBackup, type TrackerData } from "@/lib/tracker/backup";
import { deleteContact } from "@/lib/tracker/contacts";
import {
  clearPersistedPlan,
  loadPersistedPlan,
  planDeleteAll,
  restoreTracker,
  wipeCollections,
  UNDO_WINDOW_MS,
  type DeleteAllPlan,
} from "@/lib/tracker/deleteAll";
import { replaceTrackerData } from "@/lib/tracker/replace";
import { logInterview } from "@/lib/tracker/interviews";
import { addNote, deleteActivity, editActivity, moveJob } from "@/lib/tracker/logic";
import {
  DEFAULT_STAGES,
  type Activity,
  type Contact,
  type Interview,
  type Job,
  type StageRecord,
} from "@/lib/tracker/schema";
import { commit, loadTracker, type SaveProblem } from "./store";
import { useUndo } from "./useUndo";

export type LoadState = "loading" | "ready" | "unavailable" | "error";

const EMPTY: TrackerData = {
  jobs: [],
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
  activities: [],
  interviews: [],
  contacts: [],
};

/** A held plan never auto-expires on its own, but we still cap it so a stuck page can clear. */
const PERSISTED_PLAN_MAX_MS = 10 * 60 * 1000;

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

function upsert<T extends { id: string }>(list: readonly T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [item, ...list];
}

function merge<T extends { id: string }>(list: readonly T[], extra: readonly T[]): T[] {
  return extra.reduce<T[]>((all, item) => upsert(all, item), [...list]);
}

/** The stage a new job starts in: the first stage of kind saved, else the first stage. */
export function startStageId(stages: readonly StageRecord[]): string {
  return (stages.find((s) => s.kind === "saved") ?? stages[0])?.id ?? "stage-saved";
}

/** All tracker state and every change to it. Each change is saved, then reported if it fails. */
export function useTracker() {
  const [load, setLoad] = useState<LoadState>("loading");
  const [tries, setTries] = useState(0);
  const [data, setData] = useState<TrackerData>(EMPTY);
  const [unreadable, setUnreadable] = useState(0);
  const [quarantineDropped, setQuarantineDropped] = useState(0);
  const [unreadableRows, setUnreadableRows] = useState<Record<string, unknown[]>>({});
  const [problem, setProblem] = useState<SaveProblem | null>(null);
  const [announce, setAnnounce] = useState("");
  const undo = useUndo();
  const { offer } = undo;
  /** The persisted delete-all snapshot has its own timer, independent of the Undo slot. */
  const planTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPlanTimer = useCallback(() => {
    if (planTimer.current) clearTimeout(planTimer.current);
    planTimer.current = null;
  }, []);

  const expirePlan = useCallback(() => {
    stopPlanTimer();
    clearPersistedPlan();
  }, [stopPlanTimer]);

  /** Start a plan guard timer. Reset only when the restore succeeds or this timer fires. */
  const armPlanTimer = useCallback(
    (plan: DeleteAllPlan) => {
      stopPlanTimer();
      const createdAt = plan.undoUntil - UNDO_WINDOW_MS;
      const ceiling = createdAt + PERSISTED_PLAN_MAX_MS;
      const deadline = plan.held ? ceiling : Math.min(plan.undoUntil, ceiling);
      const ms = Math.min(PERSISTED_PLAN_MAX_MS, Math.max(0, deadline - Date.now()) + 1000);
      planTimer.current = setTimeout(expirePlan, ms);
    },
    [expirePlan, stopPlanTimer],
  );

  /** Offers Undo for a delete all. A failed write keeps the offer open for the rest of the window. */
  const offerRestore = useCallback(
    (plan: DeleteAllPlan) => {
      armPlanTimer(plan);
      const left = () => Math.max(0, plan.undoUntil - Date.now());
      const attempt = async (): Promise<void> => {
        const result = await restoreTracker(plan, Date.now());
        if (result.ok) {
          stopPlanTimer();
          setData(result.data);
          setProblem(null);
          setAnnounce("Restored all your tracker data.");
          return;
        }
        if (result.reason === "expired") {
          stopPlanTimer();
          setAnnounce("The 10 seconds ran out, so your data could not be brought back.");
          return;
        }
        setProblem("error");
        setAnnounce("Your data could not be written back. Press Undo to try again.");
        // A failed write puts the plan on hold, so extend the plan timer to the ceiling.
        armPlanTimer(plan);
        offer(
          {
            message: "Your data could not be written back.",
            undo: () => void attempt(),
          },
          left(),
        );
      };
      offer(
        {
          message: "Deleted all your tracker data.",
          focusUndo: true,
          undo: () => void attempt(),
        },
        left(),
      );
    },
    [armPlanTimer, offer, stopPlanTimer],
  );

  useEffect(() => {
    let cancelled = false;
    void loadTracker().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setLoad(result.reason);
        return;
      }
      setData(result.value.data);
      setUnreadable(result.value.unreadable);
      setUnreadableRows(result.value.unreadableRows);
      setQuarantineDropped(result.value.quarantineDropped);
      if (result.value.quarantineFailed > 0) setProblem("error");
      setLoad("ready");
      // A delete all done just before a reload can still be undone, held plans included.
      // Older than 10 minutes is dropped so a stuck page cannot keep offering it forever.
      const plan = loadPersistedPlan(Date.now());
      if (plan) {
        const createdAt = plan.undoUntil - UNDO_WINDOW_MS;
        if (Date.now() - createdAt > PERSISTED_PLAN_MAX_MS) {
          clearPersistedPlan();
        } else {
          offerRestore(plan);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tries, offerRestore]);

  // Clear the persisted snapshot when the tab is actually leaving, not on StrictMode remount.
  // The timer above still bounds a held plan.
  useEffect(() => {
    const onHide = () => {
      if (!planTimer.current) clearPersistedPlan();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      stopPlanTimer();
    };
  }, [stopPlanTimer]);

  const reload = useCallback(() => {
    setProblem(null);
    setLoad("loading");
    setTries((n) => n + 1);
  }, []);

  const save = useCallback(async (changes: Parameters<typeof commit>[0]) => {
    const result = await commit(changes);
    // A later success never clears an earlier failure. Only a full restore or reload does.
    if (result) setProblem(result);
  }, []);

  const stageName = useCallback(
    (id: string) => data.stages.find((s) => s.id === id)?.name ?? "this stage",
    [data.stages],
  );

  const addJob = useCallback(
    (job: Job) => {
      const activity: Activity = { id: uuid(), jobId: job.id, type: "saved", at: job.savedAt };
      setData((d) => ({
        ...d,
        jobs: [job, ...d.jobs],
        activities: [activity, ...d.activities],
      }));
      setAnnounce(`Added ${job.title} to ${stageName(job.stageId)}.`);
      void save({ save: { jobs: [job], activities: [activity] } });
    },
    [save, stageName],
  );

  const updateJob = useCallback(async (job: Job): Promise<boolean> => {
    const next = { ...job, updatedAt: nowIso() };
    setData((d) => ({ ...d, jobs: upsert(d.jobs, next) }));
    const failed = await commit({ save: { jobs: [next] } });
    if (failed) setProblem(failed);
    return failed === null;
  }, []);

  const move = useCallback(
    (job: Job, stageId: string) => {
      const result = moveJob(job, stageId, data.stages, nowIso(), uuid());
      if (!result) return;
      const { job: moved, activity } = result;
      setData((d) => ({
        ...d,
        jobs: upsert(d.jobs, moved),
        activities: [activity, ...d.activities],
      }));
      setAnnounce(`Moved ${job.title} to ${stageName(stageId)}. You can undo for 10 seconds.`);
      void save({ save: { jobs: [moved], activities: [activity] } });
      // Snapshot ONLY the move fields so a later edit to the same job is not wiped out.
      const beforeMove = {
        stageId: job.stageId,
        appliedAt: job.appliedAt,
        archivedAt: job.archivedAt,
        updatedAt: job.updatedAt,
      };
      offer({
        message: `Moved ${job.title} to ${stageName(stageId)}.`,
        undo: () => {
          setData((d) => {
            const current = d.jobs.find((j) => j.id === job.id);
            if (!current) return d;
            const reverted: Job = { ...current, ...beforeMove, updatedAt: nowIso() };
            return {
              ...d,
              jobs: upsert(d.jobs, reverted),
              activities: deleteActivity(d.activities, activity.id),
            };
          });
          setAnnounce(`Moved ${job.title} back to ${stageName(job.stageId)}.`);
          void save({
            save: { jobs: [{ ...job, ...beforeMove, updatedAt: nowIso() }] },
            drop: { activities: [activity.id] },
          });
        },
      });
    },
    [data.stages, offer, save, stageName],
  );

  const setArchived = useCallback(
    (job: Job, archived: boolean) => {
      const now = nowIso();
      const next: Job = archived
        ? { ...job, archivedAt: now, updatedAt: now }
        : { ...job, archivedAt: undefined, updatedAt: now };
      setData((d) => ({ ...d, jobs: upsert(d.jobs, next) }));
      void save({ save: { jobs: [next] } });
      const verb = archived ? "Archived" : "Restored";
      setAnnounce(`${verb} ${job.title}. You can undo for 10 seconds.`);
      // Snapshot only the archive fields so a later edit to the job is not wiped out.
      const beforeArchive = { archivedAt: job.archivedAt, updatedAt: job.updatedAt };
      offer({
        message: `${verb} ${job.title}.`,
        focusUndo: archived,
        undo: () => {
          setData((d) => {
            const current = d.jobs.find((j) => j.id === job.id);
            if (!current) return d;
            const reverted: Job = { ...current, ...beforeArchive, updatedAt: nowIso() };
            return { ...d, jobs: upsert(d.jobs, reverted) };
          });
          setAnnounce(`${archived ? "Restored" : "Archived"} ${job.title}.`);
          void save({ save: { jobs: [{ ...job, ...beforeArchive, updatedAt: nowIso() }] } });
        },
      });
    },
    [offer, save],
  );

  const removeJob = useCallback(
    (job: Job) => {
      const activities = data.activities.filter((a) => a.jobId === job.id);
      const interviews = data.interviews.filter((i) => i.jobId === job.id);
      setData((d) => ({
        ...d,
        jobs: d.jobs.filter((j) => j.id !== job.id),
        activities: d.activities.filter((a) => a.jobId !== job.id),
        interviews: d.interviews.filter((i) => i.jobId !== job.id),
      }));
      setAnnounce(`Deleted ${job.title}. You can undo for 10 seconds.`);
      void save({
        drop: {
          jobs: [job.id],
          activities: activities.map((a) => a.id),
          interviews: interviews.map((i) => i.id),
        },
      });
      offer({
        message: `Deleted ${job.title}.`,
        focusUndo: true,
        undo: () => {
          setData((d) => ({
            ...d,
            jobs: upsert(d.jobs, job),
            activities: merge(d.activities, activities),
            interviews: merge(d.interviews, interviews),
          }));
          setAnnounce(`Restored ${job.title}.`);
          void save({ save: { jobs: [job], activities, interviews } });
        },
      });
    },
    [data.activities, data.interviews, offer, save],
  );

  const addNoteTo = useCallback(
    (jobId: string, text: string): boolean => {
      const activity = addNote(jobId, text, nowIso(), uuid());
      if (!activity) return false;
      setData((d) => ({ ...d, activities: [activity, ...d.activities] }));
      void save({ save: { activities: [activity] } });
      return true;
    },
    [save],
  );

  const editEntry = useCallback(
    (id: string, text: string): boolean => {
      const next = editActivity(data.activities, id, text);
      const changed = next.find((a) => a.id === id);
      const before = data.activities.find((a) => a.id === id);
      if (!changed || !before || changed.text === before.text) return false;
      setData((d) => ({ ...d, activities: next }));
      void save({ save: { activities: [changed] } });
      return true;
    },
    [data.activities, save],
  );

  const deleteEntry = useCallback(
    (entry: Activity) => {
      setData((d) => ({ ...d, activities: deleteActivity(d.activities, entry.id) }));
      setAnnounce("Deleted the timeline entry. You can undo for 10 seconds.");
      void save({ drop: { activities: [entry.id] } });
      offer({
        message: "Deleted the timeline entry.",
        focusUndo: true,
        undo: () => {
          setData((d) => ({ ...d, activities: upsert(d.activities, entry) }));
          void save({ save: { activities: [entry] } });
        },
      });
    },
    [offer, save],
  );

  const saveInterview = useCallback(
    (interview: Interview) => {
      const isNew = !data.interviews.some((i) => i.id === interview.id);
      const activity = isNew ? logInterview(interview, nowIso(), uuid()) : null;
      setData((d) => ({
        ...d,
        interviews: upsert(d.interviews, interview),
        activities: activity ? [activity, ...d.activities] : d.activities,
      }));
      setAnnounce(isNew ? "Interview added." : "Interview saved.");
      void save({ save: { interviews: [interview], activities: activity ? [activity] : [] } });
    },
    [data.interviews, save],
  );

  const removeInterview = useCallback(
    (interview: Interview) => {
      setData((d) => ({ ...d, interviews: d.interviews.filter((i) => i.id !== interview.id) }));
      setAnnounce("Deleted the interview. You can undo for 10 seconds.");
      void save({ drop: { interviews: [interview.id] } });
      offer({
        message: "Deleted the interview.",
        focusUndo: true,
        undo: () => {
          setData((d) => ({ ...d, interviews: upsert(d.interviews, interview) }));
          void save({ save: { interviews: [interview] } });
        },
      });
    },
    [offer, save],
  );

  const saveContact = useCallback(
    (contact: Contact) => {
      setData((d) => ({ ...d, contacts: upsert(d.contacts, contact) }));
      setAnnounce(`Saved ${contact.name}.`);
      void save({ save: { contacts: [contact] } });
    },
    [save],
  );

  const removeContact = useCallback(
    (contact: Contact) => {
      const before = { contacts: data.contacts, jobs: data.jobs };
      const result = deleteContact(contact.id, data.contacts, data.jobs, nowIso());
      setData((d) => ({ ...d, contacts: result.contacts, jobs: result.jobs }));
      const changed = result.jobs.filter((j) => result.changedJobIds.includes(j.id));
      setAnnounce(`Deleted ${contact.name}. You can undo for 10 seconds.`);
      void save({ save: { jobs: changed }, drop: { contacts: [contact.id] } });
      offer({
        message: `Deleted ${contact.name}.`,
        focusUndo: true,
        undo: () => {
          const original = before.jobs.filter((j) => result.changedJobIds.includes(j.id));
          setData((d) => ({
            ...d,
            contacts: upsert(d.contacts, contact),
            jobs: merge(d.jobs, original),
          }));
          void save({ save: { contacts: [contact], jobs: original } });
        },
      });
    },
    [data.contacts, data.jobs, offer, save],
  );

  const saveStages = useCallback(
    (next: StageRecord[]) => {
      const gone = data.stages.filter((s) => !next.some((n) => n.id === s.id)).map((s) => s.id);
      setData((d) => ({ ...d, stages: next }));
      void save({ save: { stages: next }, drop: { stages: gone } });
    },
    [data.stages, save],
  );

  const importJobs = useCallback(
    (jobs: Job[], summary: string) => {
      setData((d) => ({ ...d, jobs: merge(d.jobs, jobs) }));
      setAnnounce(summary);
      void save({ save: { jobs } });
    },
    [save],
  );

  const restoreBackup = useCallback(
    async (incoming: TrackerData): Promise<{ ok: true } | { ok: false; message: string }> => {
      const result = await replaceTrackerData(incoming);
      if (result.ok) {
        setData(incoming);
        setProblem(null);
        setAnnounce(`Restored ${incoming.jobs.length} jobs from your backup.`);
        return { ok: true };
      }
      setProblem(result.reason === "full" ? "full" : "error");
      return {
        ok: false,
        message: result.restored
          ? "The backup could not be written, so your earlier data was put back. Nothing changed."
          : "The backup could not be written in full, and your earlier data could not be put back. Export what you can from this page now, then reload.",
      };
    },
    [],
  );

  const deleteAll = useCallback(
    async (opts?: {
      includeUnreadable?: boolean;
    }): Promise<
      { ok: true; persisted: boolean } | { ok: false; message: string; unreadable?: number }
    > => {
      const plan = planDeleteAll(data, Date.now(), unreadable, {
        includeUnreadable: opts?.includeUnreadable === true,
      });
      if ("reason" in plan) {
        return {
          ok: false,
          unreadable: plan.skipped,
          message: `${plan.skipped} saved ${plan.skipped === 1 ? "item" : "items"} could not be read, so nothing was deleted.`,
        };
      }
      const { ok: wiped, remaining } = await wipeCollections(plan.clear);
      if (!wiped) {
        // Part of the data may be gone. Keep the copy and let Undo put it back.
        setProblem("error");
        offerRestore(plan);
        return {
          ok: false,
          message: `Not everything could be deleted. Still on this device: ${remaining.join(", ")}. You can undo for 10 seconds to put your data back, or reload and try again.`,
        };
      }
      setData({ ...EMPTY, stages: DEFAULT_STAGES.map((s) => ({ ...s })) });
      setAnnounce(
        `Deleted all your tracker data. You can undo for 10 seconds.${plan.persisted ? "" : " Undo will not work after a reload."}`,
      );
      offerRestore(plan);
      return { ok: true, persisted: plan.persisted === true };
    },
    [data, unreadable, offerRestore],
  );

  const backupText = useCallback(
    () => buildTrackerBackup(data, new Date(), unreadableRows),
    [data, unreadableRows],
  );

  return {
    load,
    data,
    unreadable,
    quarantineDropped,
    reload,
    problem,
    announce,
    setAnnounce,
    undo,
    actions: {
      addJob,
      updateJob,
      move,
      setArchived,
      removeJob,
      addNoteTo,
      editEntry,
      deleteEntry,
      saveInterview,
      removeInterview,
      saveContact,
      removeContact,
      saveStages,
      importJobs,
      restoreBackup,
      deleteAll,
      backupText,
    },
  };
}

export type Tracker = ReturnType<typeof useTracker>;
