"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import type { CountryCode } from "@/lib/countries";
import type { Job, StageRecord } from "@/lib/tracker/schema";
import { CardMenu } from "./CardMenu";
import { describeSalary, formatWhen } from "./format";

/** Cards drawn per stage before "Show more", so a board of 1,000 jobs stays quick. */
export const STAGE_PAGE = 50;

type Props = {
  jobs: readonly Job[];
  stages: readonly StageRecord[];
  country: CountryCode;
  onOpen: (job: Job) => void;
  onMove: (job: Job, stageId: string) => void;
  onArchive: (job: Job) => void;
  onDelete: (job: Job) => void;
};

/** A job whose stage was removed shows in the first stage, so it never disappears. */
export function columnOf(job: Job, stages: readonly StageRecord[]): string {
  return stages.some((s) => s.id === job.stageId) ? job.stageId : (stages[0]?.id ?? job.stageId);
}

type Target = { id: string; kind: "previous" | "next" | "card" };

export function BoardView({ jobs, stages, country, onOpen, onMove, onArchive, onDelete }: Props) {
  const [extra, setExtra] = useState<Record<string, number>>({});
  // A moved card jumps to another column, so keyboard focus is handed to its new buttons.
  const refocus = useRef<Target | null>(null);

  useEffect(() => {
    const wanted = refocus.current;
    if (!wanted) return;
    // Clear after use, so a later unrelated render does not steal focus.
    refocus.current = null;
    if (wanted.kind === "card") {
      const card = document.querySelector<HTMLElement>(`[data-open-job="${wanted.id}"]`);
      card?.focus();
      return;
    }
    const other = wanted.kind === "next" ? "previous" : "next";
    const target =
      document.querySelector<HTMLElement>(`[data-move="${wanted.id}:${wanted.kind}"]`) ??
      document.querySelector<HTMLElement>(`[data-move="${wanted.id}:${other}"]`);
    target?.focus();
  }, [jobs]);

  // Group jobs per stage once per [jobs, stages] change, so each column render is cheap.
  const grouped = useMemo(() => {
    const byStage = new Map<string, Job[]>();
    for (const stage of stages) byStage.set(stage.id, []);
    for (const job of jobs) {
      const col = columnOf(job, stages);
      const bucket = byStage.get(col);
      if (bucket) bucket.push(job);
    }
    for (const bucket of byStage.values()) {
      bucket.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return byStage;
  }, [jobs, stages]);

  return (
    <div className="flex min-w-0 flex-col gap-6 md:flex-row md:overflow-x-auto md:pb-2">
      {stages.map((stage, index) => {
        const inStage = grouped.get(stage.id) ?? [];
        const limit = STAGE_PAGE + (extra[stage.id] ?? 0);
        const previous = stages[index - 1];
        const next = stages[index + 1];
        return (
          <section
            key={stage.id}
            aria-labelledby={`stage-${stage.id}`}
            className="flex min-w-0 flex-col gap-3 rounded-card bg-surface-2 p-3 md:w-64 md:shrink-0"
          >
            <h2
              id={`stage-${stage.id}`}
              className="px-1 text-sm font-semibold [overflow-wrap:anywhere]"
            >
              {stage.name}{" "}
              <span className="font-normal text-muted tabular-nums">{inStage.length}</span>
            </h2>
            {inStage.length === 0 ? (
              <p className="text-sm text-muted">Nothing here yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {inStage.slice(0, limit).map((job) => (
                  <li key={job.id}>
                    <JobCard
                      job={job}
                      stages={stages}
                      country={country}
                      previous={previous}
                      next={next}
                      onOpen={onOpen}
                      onMove={(target, stageId) => {
                        if (target.stageId !== stageId) {
                          refocus.current = { id: target.id, kind: "card" };
                          onMove(target, stageId);
                        }
                      }}
                      onMoveAdjacent={(target, side) => {
                        const target_ = side === "previous" ? previous : next;
                        if (target_ && target_.id !== target.stageId) {
                          refocus.current = { id: target.id, kind: side };
                          onMove(target, target_.id);
                        }
                      }}
                      onArchive={onArchive}
                      onDelete={onDelete}
                    />
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
                    [stage.id]: (current[stage.id] ?? 0) + STAGE_PAGE,
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
  );
}

type CardProps = {
  job: Job;
  stages: readonly StageRecord[];
  country: CountryCode;
  previous: StageRecord | undefined;
  next: StageRecord | undefined;
  onOpen: (job: Job) => void;
  onMove: (job: Job, stageId: string) => void;
  onMoveAdjacent: (job: Job, side: "previous" | "next") => void;
  onArchive: (job: Job) => void;
  onDelete: (job: Job) => void;
};

function JobCardBase({
  job,
  stages,
  country,
  previous,
  next,
  onOpen,
  onMove,
  onMoveAdjacent,
  onArchive,
  onDelete,
}: CardProps) {
  const pay = describeSalary(job, country);
  return (
    <Card className="flex min-w-0 flex-col gap-2 p-4">
      <button
        type="button"
        data-open-job={job.id}
        onClick={() => onOpen(job)}
        className="min-h-11 text-left font-semibold [overflow-wrap:anywhere] hover:underline"
      >
        {job.title}
      </button>
      <p className="text-sm text-muted [overflow-wrap:anywhere]">
        {job.company || "Company not given"}
      </p>
      {pay ? <p className="text-sm tabular-nums [overflow-wrap:anywhere]">{pay}</p> : null}
      {job.nextStep ? (
        <p className="text-sm [overflow-wrap:anywhere]">
          {`Next: ${job.nextStep.text}, ${formatWhen(job.nextStep.dueAt, country)}`}
        </p>
      ) : null}
      {job.tags && job.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {job.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      ) : null}
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
      <div className="flex flex-wrap gap-2">
        {previous ? (
          <IconButton
            variant="secondary"
            label={`Move ${job.title} to ${previous.name}`}
            icon={<ChevronLeft className="rtl:rotate-180" />}
            data-move={`${job.id}:previous`}
            onClick={() => onMoveAdjacent(job, "previous")}
          />
        ) : null}
        {next ? (
          <IconButton
            variant="secondary"
            label={`Move ${job.title} to ${next.name}`}
            icon={<ChevronRight className="rtl:rotate-180" />}
            data-move={`${job.id}:next`}
            onClick={() => onMoveAdjacent(job, "next")}
          />
        ) : null}
        <CardMenu
          job={job}
          stages={stages}
          onMove={(id) => onMove(job, id)}
          onArchive={() => onArchive(job)}
          onDelete={() => onDelete(job)}
        />
      </div>
    </Card>
  );
}

// Each card stays stable across re-renders triggered elsewhere on the board.
const JobCard = memo(JobCardBase);
