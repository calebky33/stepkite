"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  BACKUP_MESSAGES,
  TRACKER_BACKUP_MAX_BYTES,
  parseTrackerBackup,
  type BackupReport,
  type TrackerData,
} from "@/lib/tracker/backup";
import { readFileText } from "./download";

type Props = {
  onRestore: (data: TrackerData) => Promise<{ ok: true } | { ok: false; message: string }>;
};

type Pending = { data: TrackerData; report: BackupReport; unreadable: number };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain lines about what the file changed to stay consistent. Empty when nothing did. */
function reportLines(r: BackupReport, unreadable: number): string[] {
  const lines: string[] = [];
  if (r.droppedDuplicates > 0) {
    lines.push(
      `${plural(r.droppedDuplicates, "repeated item was", "repeated items were")} left out.`,
    );
  }
  if (r.remappedJobs > 0) {
    lines.push(
      `${plural(r.remappedJobs, "job moved", "jobs moved")} to Saved because its stage was missing.`,
    );
  }
  if (r.prunedActivities > 0 || r.prunedInterviews > 0) {
    lines.push(
      `${plural(r.prunedActivities, "timeline entry", "timeline entries")} and ${plural(r.prunedInterviews, "interview", "interviews")} were left out because their job is not in the file.`,
    );
  }
  if (r.prunedContactLinks > 0) {
    lines.push(
      `${plural(r.prunedContactLinks, "contact link was", "contact links were")} removed because the contact is not in the file.`,
    );
  }
  if (unreadable > 0) {
    lines.push(`${plural(unreadable, "item in the file", "items in the file")} could not be read.`);
  }
  return lines;
}

export function ImportBackup({ onRestore }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(null);
    setMessage("");
    if (file.size > TRACKER_BACKUP_MAX_BYTES) {
      setMessage(BACKUP_MESSAGES["too-big"]);
      return;
    }
    try {
      const result = parseTrackerBackup(await readFileText(file), file.size);
      if (result.ok) {
        setPending({ data: result.data, report: result.report, unreadable: result.unreadable });
      } else {
        const where =
          result.error === "wrong-shape" && result.issueCount !== undefined
            ? ` We found ${plural(result.issueCount, "problem", "problems")}. The first is at ${result.firstPath ?? "the top of the file"}.`
            : "";
        setMessage(`${BACKUP_MESSAGES[result.error]}${where}`);
      }
    } catch {
      setMessage(BACKUP_MESSAGES["not-json"]);
    }
  }

  async function restore() {
    if (!pending) return;
    setBusy(true);
    const result = await onRestore(pending.data);
    setBusy(false);
    if (result.ok) setPending(null);
    else setMessage(result.message);
  }

  const lines = pending ? reportLines(pending.report, pending.unreadable) : [];

  return (
    <section aria-labelledby="import-backup-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="import-backup-heading" className="font-display text-xl">
        Restore a backup
      </h3>
      <p className="max-w-prose text-muted">
        Choose a backup file you saved from Stepkite. Restoring replaces the jobs, contacts and
        interviews on this device with the ones in the file. Export a backup first if you want to
        keep what is here.
      </p>
      <Field label="Backup file">
        {(c) => (
          <input
            id={c.id}
            type="file"
            accept=".json,application/json"
            aria-describedby={c["aria-describedby"]}
            onChange={(e) => void choose(e)}
            className="min-h-11 w-full text-base"
          />
        )}
      </Field>
      {pending ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p>
            {`This backup holds ${plural(pending.data.jobs.length, "job", "jobs")}, ${plural(pending.data.contacts.length, "contact", "contacts")} and ${plural(pending.data.interviews.length, "interview", "interviews")}.`}
          </p>
          {lines.length > 0 ? (
            <ul className="list-disc ps-5 text-sm">
              {lines.map((l, i) => (
                <li key={`line-${i}`}>{l}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button loading={busy} onClick={() => void restore()}>
              Replace my data with this backup
            </Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {message ? (
        <p role="alert" className="text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}
