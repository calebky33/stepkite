"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { listIds, readItem, writeItem } from "@/lib/storage/db";
import { STAGES, STAGE_LABELS, jobSchema, type Job, type Stage } from "@/lib/tracker/schema";

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

  function move(job: Job, stage: Stage) {
    const moved: Job = { ...job, stage, updatedAt: new Date().toISOString() };
    setJobs((current) => current.map((j) => (j.id === job.id ? moved : j)));
    setAnnounce(`Moved ${job.title} to ${STAGE_LABELS[stage]}.`);
    void persist(moved);
  }

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <Card>
        <form onSubmit={addJob} noValidate className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Add a job</h2>
          <div className="grid gap-4 md:grid-cols-3">
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
        <div aria-busy="true" className="flex flex-col gap-4 md:flex-row">
          <p role="status" className="sr-only">
            Loading your jobs
          </p>
          {STAGES.map((s) => (
            <Skeleton key={s} className="h-32 w-full md:w-64 md:shrink-0" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-muted">No jobs saved yet. Add one above to start your board.</p>
      ) : (
        <div className="flex min-w-0 flex-col gap-6 md:flex-row md:overflow-x-auto md:pb-2">
          {STAGES.map((stage, index) => {
            const inStage = jobs
              .filter((j) => j.stage === stage)
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            const previous = STAGES[index - 1];
            const next = STAGES[index + 1];
            return (
              <section
                key={stage}
                aria-labelledby={`stage-${stage}`}
                className="flex min-w-0 flex-col gap-3 md:w-64 md:shrink-0"
              >
                <h2 id={`stage-${stage}`} className="text-base font-semibold">
                  {STAGE_LABELS[stage]}{" "}
                  <span className="font-normal text-muted tabular-nums">{inStage.length}</span>
                </h2>
                {inStage.length === 0 ? (
                  <p className="text-sm text-muted">Nothing here yet.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {inStage.map((job) => (
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
                              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
                            >
                              Open job ad
                            </a>
                          ) : null}
                          <div className="flex gap-2">
                            {previous ? (
                              <IconButton
                                variant="secondary"
                                label={`Move ${job.title} to ${STAGE_LABELS[previous]}`}
                                icon={<ChevronLeft />}
                                onClick={() => move(job, previous)}
                              />
                            ) : null}
                            {next ? (
                              <IconButton
                                variant="secondary"
                                label={`Move ${job.title} to ${STAGE_LABELS[next]}`}
                                icon={<ChevronRight />}
                                onClick={() => move(job, next)}
                              />
                            ) : null}
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
