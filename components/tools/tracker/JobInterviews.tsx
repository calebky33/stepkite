"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CountryCode } from "@/lib/countries";
import type { Interview, Job } from "@/lib/tracker/schema";
import { InterviewForm } from "./InterviewForm";
import { InterviewRow } from "./InterviewRow";
import { usePanelDirty } from "./SidePanel";

type Props = {
  job: Job;
  interviews: readonly Interview[];
  country: CountryCode;
  onSave: (interview: Interview) => void;
  onDelete: (interview: Interview) => void;
};

/** Interviews for one job, with add, edit and the result. */
export function JobInterviews({ job, interviews, country, onSave, onDelete }: Props) {
  const [form, setForm] = useState<"new" | Interview | null>(null);
  const sorted = [...interviews].sort((a, b) => a.at.localeCompare(b.at));
  // An open interview form holds unsaved input, so Escape cancels it instead of closing the panel.
  usePanelDirty(form !== null, () => setForm(null));
  return (
    <section aria-labelledby="job-interviews-heading" className="flex min-w-0 flex-col gap-3">
      <h3 id="job-interviews-heading" className="font-display text-xl">
        Interviews
      </h3>
      {sorted.length === 0 && !form ? (
        <p className="text-muted">No interviews yet. Add one when you have a date.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((i) => (
            <li key={i.id} className="py-3">
              <InterviewRow
                interview={i}
                country={country}
                onEdit={() => setForm(i)}
                onDelete={() => onDelete(i)}
              />
            </li>
          ))}
        </ul>
      )}
      {form ? (
        <InterviewForm
          key={form === "new" ? "new" : form.id}
          initial={form === "new" ? undefined : form}
          jobId={job.id}
          onSave={(iv) => {
            onSave(iv);
            setForm(null);
          }}
          onCancel={() => setForm(null)}
        />
      ) : (
        <Button variant="secondary" className="self-start" onClick={() => setForm("new")}>
          Add an interview
        </Button>
      )}
    </section>
  );
}
