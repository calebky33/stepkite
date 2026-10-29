"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { listIds, readItem, removeItem, writeItem } from "@/lib/storage/db";
import { STAGES, STAGE_LABELS, jobSchema, type Job, type Stage } from "@/lib/tracker/schema";

/** How long the Undo bar stays after a delete. */
export const UNDO_MS = 10_000;

/** Cards drawn per stage before "Show more", so a board of 1,000 jobs stays quick. */
export const STAGE_PAGE = 50;

type Load = "loading" | "ready" | "unavailable";
type Errors = Partial<Record<"title" | "company" | "url", string>>;

async function loadJobs(): Promise<{ jobs: Job[]; unreadable: number; unavailable: boolean }> {
  const ids = await listIds("jobs");
  if (!ids.ok) return { jobs: [], unreadable: 0, unavailable: true };
  const results = await Promise.all(ids.value.map((id) => readItem("jobs", id, jobSchema)));
  const jobs: Job[] = [];
  let unreadable = 0;
  for (const r of results) {
    if (r.ok) jobs.push(r.value);
    else if (r.reason === "invalid") unreadable += 1;
  }
  return { jobs, unreadable, unavailable: false };
}

export function TrackerShell() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [load, setLoad] = useState<Load>("loading");
  const [unreadable, setUnreadable] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [announce, setAnnounce] = useState("");
  const [undo, setUndo] = useState<Job | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoBar = useRef<HTMLDivElement>(null);
  const [extra, setExtra] = useState<Partial<Record<Stage, number>>>({});
  // A moved card jumps to another column, so keyboard focus is handed to its new buttons.
  const refocus = useRef<{ id: string; side: "previous" | "next" } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadJobs().then((r) => {
      if (cancelled) return;
      setJobs(r.jobs);
      setUnreadable(r.unreadable);
      setLoad(r.unavailable ? "unavailable" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  useEffect(() => {
    const wanted = refocus.current;
    if (!wanted) return;
    refocus.current = null;
    const other = wanted.side === "next" ? "previous" : "next";
    const target =
      document.querySelector<HTMLElement>(`[data-move="${wanted.id}:${wanted.side}"]`) ??
      document.querySelector<HTMLElement>(`[data-move="${wanted.id}:${other}"]`);
    target?.focus();
  }, [jobs]);

  async function persist(job: Job) {
    const result = await writeItem("jobs", job.id, jobSchema, job);
    setSaveFailed(!result.ok);
  }

  function addJob(event: FormEvent) {
    event.preventDefault();
    const candidate = {
      id: crypto.randomUUID(),
      title,
      company,
      url: url.trim() === "" ? undefined : url.trim(),
      stage: "saved" as const,
      updatedAt: new Date().toISOString(),
    };
    const parsed = jobSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === "title" || key === "company" || key === "url") && !next[key]) {
          next[key] = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setJobs((current) => [parsed.data, ...current]);
    setTitle("");
    setCompany("");
    setUrl("");
    setAnnounce(`Added ${parsed.data.title} to Saved.`);
    void persist(parsed.data);
  }

  function move(job: Job, stage: Stage, side: "previous" | "next") {
    refocus.current = { id: job.id, side };
    const moved: Job = { ...job, stage, updatedAt: new Date().toISOString() };
    setJobs((current) => current.map((j) => (j.id === job.id ? moved : j)));
    setAnnounce(`Moved ${job.title} to ${STAGE_LABELS[stage]}.`);
    void persist(moved);
  }

  // A deleted card takes its focused button with it, so focus moves to Undo (WCAG 2.4.3).
  useEffect(() => {
    if (undo) undoBar.current?.querySelector("button")?.focus();
  }, [undo]);

  function clearUndoTimer() {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = null;
  }

  async function remove(job: Job) {
    setJobs((current) => current.filter((j) => j.id !== job.id));
    setUndo(job);
    setAnnounce(`Deleted ${job.title}. You can undo for 10 seconds.`);
    clearUndoTimer();
    undoTimer.current = setTimeout(() => {
      setUndo(null);
      undoTimer.current = null;
    }, UNDO_MS);
    const result = await removeItem("jobs", job.id);
    setSaveFailed(!result.ok);
  }

  function restore() {
    if (!undo) return;
    const job = undo;
    clearUndoTimer();
    setUndo(null);
    setJobs((current) => (current.some((j) => j.id === job.id) ? current : [job, ...current]));
    setAnnounce(`Restored ${job.title} to ${STAGE_LABELS[job.stage]}.`);
    void persist(job);
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <Card className="md:p-8">
        <form onSubmit={addJob} noValidate className="flex flex-col gap-6">
          <h2 className="font-display text-[22px] leading-tight">Add a job</h2>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            <Input
              label="Job title"
              value={title}
              error={errors.title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Company"
              value={company}
              error={errors.company}
              maxLength={200}
              onChange={(e) => setCompany(e.target.value)}
            />
            <Input
              label="Link to the job ad"
              type="url"
              inputMode="url"
              hint="Optional. Paste the full link."
              value={url}
              error={errors.url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <Button type="submit" className="self-start">
            Add job
          </Button>
        </form>
      </Card>

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      {load === "unavailable" ? (
        <p role="alert" className="text-danger">
          Saved jobs cannot be read in this browser. You can still add jobs, but they stay on this
          page until you close it. A private window can cause this.
        </p>
      ) : null}
      {saveFailed ? (
        <p role="alert" className="text-danger">
          Your last change could not be saved on this device. It stays on this page until you close
          it.
        </p>
      ) : null}
      {unreadable > 0 ? (
        <p role="alert" className="text-danger">
          {unreadable === 1
            ? "One saved job could not be read, so it is not shown."
            : `${unreadable} saved jobs could not be read, so they are not shown.`}
        </p>
      ) : null}

      {load === "loading" ? (
        <div
          aria-busy="true"
          className="flex min-w-0 flex-col gap-4 md:flex-row md:overflow-x-auto lg:grid lg:grid-cols-5 lg:overflow-visible"
        >
          <p role="status" className="sr-only">
            Loading your jobs
          </p>
          {STAGES.map((s) => (
            <Skeleton key={s} className="h-32 w-full md:w-64 md:shrink-0 lg:w-auto" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-muted">No jobs saved yet. Add one above to start your board.</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-6 md:flex-row md:overflow-x-auto md:pb-2 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible">
          {STAGES.map((stage, index) => {
            const inStage = jobs
              .filter((j) => j.stage === stage)
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            const limit = STAGE_PAGE + (extra[stage] ?? 0);
            const previous = STAGES[index - 1];
            const next = STAGES[index + 1];
            return (
              <section
                key={stage}
                aria-labelledby={`stage-${stage}`}
                className="flex min-w-0 flex-col gap-3 rounded-card bg-surface-2 p-3 md:w-64 md:shrink-0 lg:w-auto"
              >
                <h2 id={`stage-${stage}`} className="px-1 text-sm font-semibold">
                  {STAGE_LABELS[stage]}{" "}
                  <span className="font-normal text-muted tabular-nums">{inStage.length}</span>
                </h2>
                {inStage.length === 0 ? (
                  <p className="text-sm text-muted">Nothing here yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {inStage.slice(0, limit).map((job) => (
                      <li key={job.id}>
                        <Card className="flex min-w-0 flex-col gap-2 p-4">
                          <p className="font-semibold [overflow-wrap:anywhere]">{job.title}</p>
                          <p className="text-sm text-muted [overflow-wrap:anywhere]">
                            {job.company}
                          </p>
                          {job.url ? (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                            >
                              Open job ad
                            </a>
                          ) : null}
                          <div className="flex gap-2">
                            {previous ? (
                              <IconButton
                                variant="secondary"
                                label={`Move ${job.title} to ${STAGE_LABELS[previous]}`}
                                icon={<ChevronLeft className="rtl:rotate-180" />}
                                data-move={`${job.id}:previous`}
                                onClick={() => move(job, previous, "previous")}
                              />
                            ) : null}
                            {next ? (
                              <IconButton
                                variant="secondary"
                                label={`Move ${job.title} to ${STAGE_LABELS[next]}`}
                                icon={<ChevronRight className="rtl:rotate-180" />}
                                data-move={`${job.id}:next`}
                                onClick={() => move(job, next, "next")}
                              />
                            ) : null}
                            <IconButton
                              variant="ghost"
                              label={`Delete ${job.title}`}
                              icon={<Trash2 />}
                              onClick={() => void remove(job)}
                              className="ml-auto"
                            />
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
                {inStage.length > limit ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setExtra((current) => ({
                        ...current,
                        [stage]: (current[stage] ?? 0) + STAGE_PAGE,
                      }))
                    }
                  >
                    Show {Math.min(STAGE_PAGE, inStage.length - limit)} more
                  </Button>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
      {undo ? (
        <div
          ref={undoBar}
          role="status"
          className="fixed inset-x-0 bottom-[var(--consent-h,0px)] z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 shadow-pop">
            <p className="min-w-0 text-base [overflow-wrap:anywhere]">Deleted {undo.title}.</p>
            <Button variant="secondary" className="shrink-0" onClick={restore}>
              Undo
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
