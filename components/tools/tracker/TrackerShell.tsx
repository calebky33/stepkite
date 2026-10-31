"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import type { Job } from "@/lib/tracker/schema";
import { AddJob } from "./AddJob";
import { BoardView } from "./BoardView";
import { ContactsView } from "./ContactsView";
import { InterviewsView } from "./InterviewsView";
import { JobPanel } from "./JobPanel";
import { ListView } from "./ListView";
import { MetricsView } from "./MetricsView";
import { RemindersStrip } from "./RemindersStrip";
import { SettingsView } from "./SettingsView";
import { UndoBar } from "./UndoBar";
import { READ_ERROR_MESSAGE, SAVE_MESSAGES, UNAVAILABLE_MESSAGE } from "./store";
import { useNow } from "./useNow";
import { startStageId, useTracker } from "./useTracker";

export { STAGE_PAGE } from "./BoardView";
export { UNDO_MS } from "./useUndo";

const NO_JOBS = "No jobs saved yet. Add one above to start your board.";

function Loading() {
  return (
    <div aria-busy="true" className="flex min-w-0 flex-col gap-4 md:flex-row md:overflow-x-auto">
      <p role="status" className="sr-only">
        Loading your jobs
      </p>
      {[0, 1, 2, 3, 4].map((n) => (
        <Skeleton key={n} className="h-32 w-full md:w-64 md:shrink-0" />
      ))}
    </div>
  );
}

function unreadableText(n: number): string {
  return n === 1
    ? "One saved item could not be read, so it is not shown. It is kept on this device and goes into your backup."
    : `${n} saved items could not be read, so they are not shown. They are kept on this device and go into your backup.`;
}

/** The tracker screen. State lives in useTracker and every view is its own file. */
export function TrackerShell({ country = "uk" }: { country?: CountryCode }) {
  const t = useTracker();
  const now = useNow();
  const [tab, setTab] = useState("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const opener = useRef<{ el: HTMLElement | null; id: string | null }>({ el: null, id: null });

  const { data, load } = t;
  const open = data.jobs.find((j) => j.id === openId) ?? null;
  const live = data.jobs.filter((j) => !j.archivedAt);

  function openJob(job: Job) {
    const active = document.activeElement;
    opener.current = { el: active instanceof HTMLElement ? active : null, id: job.id };
    setOpenId(job.id);
  }

  /** The card that opened the panel, or the same job's card if it moved to another column. */
  function returnFocus(): HTMLElement | null {
    const { el, id } = opener.current;
    if (el?.isConnected) return el;
    const same = Array.from(document.querySelectorAll<HTMLElement>("[data-open-job]")).find(
      (node) => node.getAttribute("data-open-job") === id,
    );
    return same ?? null;
  }

  const empty = data.jobs.length === 0;
  const tabs = [
    {
      value: "board",
      label: "Board",
      content: empty ? (
        <p className="text-muted">{NO_JOBS}</p>
      ) : (
        <BoardView
          jobs={live}
          stages={data.stages}
          country={country}
          onOpen={openJob}
          onMove={t.actions.move}
          onArchive={(job) => t.actions.setArchived(job, true)}
          onDelete={t.actions.removeJob}
        />
      ),
    },
    {
      value: "list",
      label: "List",
      content: empty ? (
        <p className="text-muted">{NO_JOBS}</p>
      ) : (
        <ListView jobs={data.jobs} stages={data.stages} country={country} onOpen={openJob} />
      ),
    },
    {
      value: "interviews",
      label: "Interviews",
      content: <InterviewsView t={t} country={country} />,
    },
    { value: "contacts", label: "Contacts", content: <ContactsView t={t} country={country} /> },
    { value: "metrics", label: "Metrics", content: <MetricsView t={t} /> },
    {
      value: "settings",
      label: "Settings",
      content: <SettingsView t={t} currency={COUNTRY_INFO[country].currency} />,
    },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {load === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : load === "error" ? null : (
        <AddJob country={country} stageId={startStageId(data.stages)} onAdd={t.actions.addJob} />
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {t.announce}
      </p>

      {load === "unavailable" ? (
        <p role="alert" className="text-danger">
          {UNAVAILABLE_MESSAGE}
        </p>
      ) : null}
      {load === "error" ? (
        <div role="alert" className="flex flex-col items-start gap-3 text-danger">
          <p>{READ_ERROR_MESSAGE}</p>
          <Button variant="secondary" onClick={t.reload}>
            Try again
          </Button>
        </div>
      ) : null}
      {t.problem ? (
        <p role="alert" className="text-danger">
          {SAVE_MESSAGES[t.problem]}
        </p>
      ) : null}
      {t.unreadable > 0 ? (
        <p role="alert" className="text-danger">
          {unreadableText(t.unreadable)}
          {t.quarantineDropped > 0
            ? ` ${t.quarantineDropped} of them could not be set aside as a copy. The originals are still in place.`
            : ""}
        </p>
      ) : null}

      {load === "loading" ? (
        <Loading />
      ) : load === "error" ? null : (
        <>
          {empty ? null : (
            <RemindersStrip
              jobs={data.jobs}
              interviews={data.interviews}
              now={now}
              country={country}
              onOpen={openJob}
            />
          )}
          <Tabs label="Tracker views" tabs={tabs} value={tab} onValueChange={setTab} />
        </>
      )}

      {open ? (
        <JobPanel
          key={open.id}
          job={open}
          t={t}
          country={country}
          onClose={() => setOpenId(null)}
          returnFocus={returnFocus}
        />
      ) : null}
      {open ? null : (
        <div data-tracker-undo>
          <UndoBar entry={t.undo.entry} onUndo={t.undo.run} />
        </div>
      )}
    </div>
  );
}
