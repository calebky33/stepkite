"use client";

import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { exportCsv } from "@/lib/tracker/csv";
import { dateStamp, downloadText } from "./download";
import type { Tracker } from "./useTracker";

/** Export, and delete all with a confirm. Both act on this device only. */
export function DataSettings({ t }: { t: Tracker }) {
  const [confirming, setConfirming] = useState(false);
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const [alsoUnreadable, setAlsoUnreadable] = useState<number | null>(null);
  const empty = t.data.jobs.length === 0;

  async function run(includeUnreadable: boolean) {
    setProblem("");
    setNote("");
    const r = await t.actions.deleteAll({ includeUnreadable });
    if (r.ok) {
      if (!r.persisted) setNote("Undo works for 10 seconds, but it will not survive a reload.");
    } else if (r.unreadable !== undefined) {
      setAlsoUnreadable(r.unreadable);
    } else {
      setProblem(r.message);
    }
  }

  function download(kind: "json" | "csv") {
    setProblem("");
    try {
      const stamp = dateStamp(new Date());
      if (kind === "json") {
        downloadText(`stepkite-tracker-${stamp}.json`, t.actions.backupText(), "application/json");
      } else {
        downloadText(
          `stepkite-jobs-${stamp}.csv`,
          exportCsv(t.data.jobs, t.data.stages),
          "text/csv",
        );
      }
      t.setAnnounce(
        `Your ${kind === "json" ? "backup" : "spreadsheet"} was saved to your downloads.`,
      );
    } catch {
      setProblem("Your browser would not save the file. Try again, or use a different browser.");
    }
  }

  return (
    <section aria-labelledby="data-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="data-heading" className="font-display text-xl">
        Your data
      </h3>
      <p className="max-w-prose text-muted">
        Everything is kept on this device. Save a copy now and then, because clearing your browser
        data removes it.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" disabled={empty} onClick={() => download("json")}>
          <Download size={18} aria-hidden="true" className="mr-2" />
          Export backup (JSON)
        </Button>
        <Button variant="secondary" disabled={empty} onClick={() => download("csv")}>
          <Download size={18} aria-hidden="true" className="mr-2" />
          Export jobs (CSV)
        </Button>
      </div>
      {empty ? <p className="text-sm text-muted">Add a job before you export.</p> : null}
      {problem ? (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button variant="secondary" className="self-start" onClick={() => setConfirming(true)}>
          <Trash2 size={18} aria-hidden="true" className="mr-2 text-danger" />
          Delete all data
        </Button>
      </div>
      {note ? (
        <p role="status" className="text-sm text-muted">
          {note}
        </p>
      ) : null}
      <Dialog
        open={alsoUnreadable !== null}
        onOpenChange={(open) => (open ? undefined : setAlsoUnreadable(null))}
        title="Some items could not be read"
        description={`Also delete ${alsoUnreadable ?? 0} ${alsoUnreadable === 1 ? "item" : "items"} that could not be read. These cannot be undone. Export a backup first, because a backup keeps them.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAlsoUnreadable(null)}>
              Keep my data
            </Button>
            <Button
              onClick={() => {
                setAlsoUnreadable(null);
                void run(true);
              }}
            >
              Delete everything including them
            </Button>
          </>
        }
      />
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete all your tracker data?"
        description="This removes every job, note, interview and contact from this device. Your stages go back to the defaults. You can undo for 10 seconds. Export a backup first if you want a copy."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep my data
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                void run(false);
              }}
            >
              Delete everything
            </Button>
          </>
        }
      />
    </section>
  );
}
