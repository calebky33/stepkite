"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CountryCode } from "@/lib/countries";
import { upcomingInterviews } from "@/lib/tracker/interviews";
import type { Interview } from "@/lib/tracker/schema";
import { InterviewForm } from "./InterviewForm";
import { InterviewRow } from "./InterviewRow";
import type { Tracker } from "./useTracker";
import { useNow } from "./useNow";

type Props = { t: Tracker; country: CountryCode };

export function InterviewsView({ t, country }: Props) {
  const now = useNow();
  const [form, setForm] = useState<"new" | Interview | null>(null);
  const { jobs, interviews } = t.data;
  const live = jobs.filter((j) => !j.archivedAt);
  const upcoming = upcomingInterviews(interviews, now);
  const past = interviews
    .filter((i) => !upcoming.some((u) => u.id === i.id))
    .sort((a, b) => b.at.localeCompare(a.at));
  const label = (i: Interview) => {
    const job = jobs.find((j) => j.id === i.jobId);
    return job ? `${job.title}, ${job.company}` : "A job you deleted";
  };

  const list = (title: string, items: Interview[], empty: string) => (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <h3 className="font-display text-xl">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface px-4">
          {items.map((i) => (
            <li key={i.id} className="py-3">
              <InterviewRow
                interview={i}
                country={country}
                jobLabel={label(i)}
                onEdit={() => setForm(i)}
                onDelete={() => t.actions.removeInterview(i)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {form ? (
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4 md:p-6">
          <h3 className="font-display text-xl">
            {form === "new" ? "Add an interview" : "Edit interview"}
          </h3>
          <InterviewForm
            initial={form === "new" ? undefined : form}
            jobs={live}
            onSave={(iv) => {
              t.actions.saveInterview(iv);
              setForm(null);
            }}
            onCancel={() => setForm(null)}
          />
        </div>
      ) : live.length === 0 ? (
        <p className="text-muted">Add a job first, then you can log an interview for it.</p>
      ) : (
        <Button className="self-start" onClick={() => setForm("new")}>
          Add an interview
        </Button>
      )}
      {list("Upcoming", upcoming, "No interviews coming up. Add one when you have a date.")}
      {list("Past", past, "No past interviews yet.")}
    </div>
  );
}
