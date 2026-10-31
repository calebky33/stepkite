"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CountryCode } from "@/lib/countries";
import type { Job } from "@/lib/tracker/schema";
import { JobContacts } from "./JobContacts";
import { JobEditForm } from "./JobEditForm";
import { JobInterviews } from "./JobInterviews";
import { NativeSelect } from "./fields";
import { SidePanel } from "./SidePanel";
import { TagsEditor } from "./TagsEditor";
import { Timeline } from "./Timeline";
import { UndoBar } from "./UndoBar";
import type { Tracker } from "./useTracker";

type Props = {
  job: Job;
  t: Tracker;
  country: CountryCode;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
};

/** Everything about one job, in a bottom sheet on phones and a side panel from 1024px. */
export function JobPanel({ job, t, country, onClose, returnFocus }: Props) {
  const { stages, activities, interviews, contacts } = t.data;
  const mine = activities.filter((a) => a.jobId === job.id);
  const theirs = interviews.filter((i) => i.jobId === job.id);
  const known = stages.some((s) => s.id === job.stageId);
  const options = known
    ? stages.map((s) => ({ value: s.id, label: s.name }))
    : [
        { value: job.stageId, label: "Stage removed" },
        ...stages.map((s) => ({ value: s.id, label: s.name })),
      ];

  return (
    <SidePanel
      title={job.title}
      subtitle={job.company || "Company not given"}
      onClose={onClose}
      returnFocus={returnFocus}
      announce={t.announce}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <NativeSelect
          label="Stage"
          value={job.stageId}
          options={options}
          onChange={(e) => t.actions.move(job, e.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-base font-semibold text-primary underline-offset-4 hover:underline"
            >
              Open job ad
            </a>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              t.actions.setArchived(job, !job.archivedAt);
              if (!job.archivedAt) onClose();
            }}
          >
            {job.archivedAt ? (
              <ArchiveRestore size={18} aria-hidden="true" className="mr-2" />
            ) : (
              <Archive size={18} aria-hidden="true" className="mr-2" />
            )}
            {job.archivedAt ? "Restore from archive" : "Archive job"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              t.actions.removeJob(job);
              onClose();
            }}
          >
            <Trash2 size={18} aria-hidden="true" className="mr-2 text-danger" />
            Delete job
          </Button>
        </div>
      </div>
      <JobEditForm key={job.id} job={job} country={country} onSave={t.actions.updateJob} />
      <TagsEditor job={job} onChange={(next) => void t.actions.updateJob(next)} />
      <JobContacts
        job={job}
        contacts={contacts}
        onChange={(next) => void t.actions.updateJob(next)}
      />
      <JobInterviews
        job={job}
        interviews={theirs}
        country={country}
        onSave={t.actions.saveInterview}
        onDelete={t.actions.removeInterview}
      />
      <Timeline
        entries={mine}
        country={country}
        onAdd={(text) => t.actions.addNoteTo(job.id, text)}
        onEdit={t.actions.editEntry}
        onDelete={t.actions.deleteEntry}
      />
      <div data-tracker-undo>
        <UndoBar entry={t.undo.entry} onUndo={t.undo.run} inline />
      </div>
    </SidePanel>
  );
}
