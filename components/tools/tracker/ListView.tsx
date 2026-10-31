"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { CountryCode } from "@/lib/countries";
import { sortJobs, type SortKey } from "@/lib/tracker/logic";
import type { Job, StageRecord } from "@/lib/tracker/schema";
import { formatWhen } from "./format";

/** Rows drawn before "Show more", so 500 jobs stay quick. */
export const LIST_PAGE = 100;

type Props = {
  jobs: readonly Job[];
  stages: readonly StageRecord[];
  country: CountryCode;
  onOpen: (job: Job) => void;
};

const COLUMNS: readonly { key: SortKey; label: string }[] = [
  { key: "title", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "savedAt", label: "Saved" },
  { key: "appliedAt", label: "Applied" },
  { key: "updatedAt", label: "Updated" },
];

export function ListView({ jobs, stages, country, onOpen }: Props) {
  const [key, setKey] = useState<SortKey>("updatedAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [showArchived, setShowArchived] = useState(false);
  const [limit, setLimit] = useState(LIST_PAGE);

  const rows = useMemo(
    () =>
      sortJobs(
        jobs.filter((j) => showArchived || !j.archivedAt),
        key,
        dir,
      ),
    [jobs, key, dir, showArchived],
  );

  function sortBy(next: SortKey) {
    if (next === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setKey(next);
      setDir(next === "title" || next === "company" ? "asc" : "desc");
    }
  }

  const stageName = (job: Job) => stages.find((s) => s.id === job.stageId)?.name ?? "Unknown stage";
  const date = (iso?: string) => (iso ? formatWhen(iso, country) : "Not yet");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
        Show archived jobs
      </label>
      {rows.length === 0 ? (
        <p className="text-muted">
          No jobs to list. Archived jobs stay hidden unless you show them.
        </p>
      ) : (
        <Table label="All jobs">
          <TableHead>
            <TableRow>
              {COLUMNS.slice(0, 2).map((c) => (
                <SortHeader key={c.key} col={c} active={key} dir={dir} onSort={sortBy} />
              ))}
              <TableHeaderCell>Stage</TableHeaderCell>
              {COLUMNS.slice(2).map((c) => (
                <SortHeader key={c.key} col={c} active={key} dir={dir} onSort={sortBy} />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, limit).map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <button
                    type="button"
                    data-open-job={job.id}
                    onClick={() => onOpen(job)}
                    className="min-h-11 text-left font-semibold [overflow-wrap:anywhere] hover:underline"
                  >
                    {job.title}
                  </button>
                  {job.archivedAt ? (
                    <span className="ml-2 text-sm text-muted">Archived</span>
                  ) : null}
                </TableCell>
                <TableCell>{job.company || "Company not given"}</TableCell>
                <TableCell>{stageName(job)}</TableCell>
                <TableCell>{date(job.savedAt)}</TableCell>
                <TableCell>{date(job.appliedAt)}</TableCell>
                <TableCell>{date(job.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {rows.length > limit ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => setLimit((n) => n + LIST_PAGE)}
        >
          {`Show ${Math.min(LIST_PAGE, rows.length - limit)} more`}
        </Button>
      ) : null}
    </div>
  );
}

type HeaderProps = {
  col: { key: SortKey; label: string };
  active: SortKey;
  dir: "asc" | "desc";
  onSort: (key: SortKey) => void;
};

function SortHeader({ col, active, dir, onSort }: HeaderProps) {
  const on = col.key === active;
  return (
    <TableHeaderCell aria-sort={on ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(col.key)}
        className="inline-flex min-h-11 items-center gap-1 font-semibold"
      >
        {col.label}
        {on ? (
          dir === "asc" ? (
            <ArrowUp size={16} aria-hidden="true" />
          ) : (
            <ArrowDown size={16} aria-hidden="true" />
          )
        ) : null}
      </button>
    </TableHeaderCell>
  );
}
