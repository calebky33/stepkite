"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  INTERVIEW_KINDS,
  interviewSchema,
  type Interview,
  type InterviewKind,
  type Job,
} from "@/lib/tracker/schema";
import { NativeSelect, TextArea } from "./fields";
import { fromInput, toDateTimeInput } from "./format";

export const KIND_NAMES: Record<InterviewKind, string> = {
  phone: "Phone",
  video: "Video",
  onsite: "On site",
};

type Errors = Partial<Record<"jobId" | "at" | "people" | "prep" | "result", string>>;

type Props = {
  initial?: Interview;
  /** Fixed when the form sits inside a job. Otherwise the person picks a job. */
  jobId?: string;
  jobs?: readonly Job[];
  onSave: (interview: Interview) => void;
  onCancel: () => void;
};

export function InterviewForm({ initial, jobId, jobs = [], onSave, onCancel }: Props) {
  const [pickedJob, setPickedJob] = useState(initial?.jobId ?? jobId ?? "");
  const [at, setAt] = useState(toDateTimeInput(initial?.at));
  const [kind, setKind] = useState<InterviewKind>(initial?.kind ?? "video");
  const [people, setPeople] = useState(initial?.people ?? "");
  const [prep, setPrep] = useState(initial?.prep ?? "");
  const [result, setResult] = useState(initial?.result ?? "");
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    const when = fromInput(at);
    if (!when) found.at = "Enter the date and time of the interview.";
    if (!pickedJob) found.jobId = "Choose the job this interview is for.";
    const parsed = interviewSchema.safeParse({
      id: initial?.id ?? crypto.randomUUID(),
      jobId: pickedJob,
      at: when ?? "",
      kind,
      people: people.trim() === "" ? undefined : people,
      prep: prep === "" ? undefined : prep,
      result: result.trim() === "" ? undefined : result,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (key === "people" || key === "prep" || key === "result") {
          found[key] ??= "That is too long. Shorten it and try again.";
        }
      }
    }
    if (Object.keys(found).length > 0 || !parsed.success) {
      setErrors(found);
      return;
    }
    onSave(parsed.data);
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-4">
      {jobId === undefined ? (
        <NativeSelect
          label="Job"
          value={pickedJob}
          error={errors.jobId}
          onChange={(e) => setPickedJob(e.target.value)}
          options={[
            { value: "", label: "Choose a job" },
            ...jobs.map((j) => ({ value: j.id, label: `${j.title}, ${j.company}` })),
          ]}
        />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Date and time"
          type="datetime-local"
          value={at}
          error={errors.at}
          onChange={(e) => setAt(e.target.value)}
        />
        <NativeSelect
          label="Type"
          value={kind}
          onChange={(e) => {
            const next = INTERVIEW_KINDS.find((k) => k === e.target.value);
            if (next) setKind(next);
          }}
          options={INTERVIEW_KINDS.map((k) => ({ value: k, label: KIND_NAMES[k] }))}
        />
      </div>
      <Input
        label="People"
        hint="Who you will meet."
        value={people}
        error={errors.people}
        onChange={(e) => setPeople(e.target.value)}
      />
      <TextArea
        label="Prep notes"
        value={prep}
        error={errors.prep}
        onChange={(e) => setPrep(e.target.value)}
      />
      <TextArea
        label="Result"
        hint="Fill this in after the interview."
        value={result}
        error={errors.result}
        onChange={(e) => setResult(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save interview</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
