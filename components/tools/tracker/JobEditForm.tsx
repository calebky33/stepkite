"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import type { Job } from "@/lib/tracker/schema";
import { DetailFields, MainFields } from "./JobFields";
import { toDateInput } from "./format";
import { buildJob, valuesFromJob, type JobErrors, type JobValues } from "./jobForm";
import { usePanelDirty } from "./SidePanel";

type Props = { job: Job; country: CountryCode; onSave: (job: Job) => Promise<boolean> };

/** Edits every field of one job. Nothing is saved until the person presses Save changes. */
export function JobEditForm({ job, country, onSave }: Props) {
  const currency = COUNTRY_INFO[country].currency;
  const initial = useMemo(() => valuesFromJob(job, currency), [job, currency]);
  const [values, setValues] = useState<JobValues>(initial);
  const [errors, setErrors] = useState<JobErrors>({});
  const [status, setStatus] = useState("");
  const openedWith = useRef(values.appliedAt);

  // Dirty when any field differs from what the form opened with.
  const dirty = useMemo(() => {
    for (const key of Object.keys(initial) as (keyof JobValues)[]) {
      if (values[key] !== initial[key]) return true;
    }
    return false;
  }, [initial, values]);

  const cancelEdits = () => {
    setValues(initial);
    setErrors({});
    setStatus("");
  };
  usePanelDirty(dirty, cancelEdits);

  const change = (patch: Partial<JobValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setStatus("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    // Moving a job to Applied fills the date. Keep it unless the person typed another.
    const appliedAt =
      values.appliedAt === openedWith.current ? toDateInput(job.appliedAt) : values.appliedAt;
    const built = buildJob(
      { ...values, appliedAt },
      {
        id: job.id,
        stageId: job.stageId,
        savedAt: job.savedAt,
        tags: job.tags,
        contactIds: job.contactIds,
        archivedAt: job.archivedAt,
      },
      new Date().toISOString(),
    );
    if (!built.ok) {
      setErrors(built.errors);
      setStatus("");
      return;
    }
    setErrors({});
    const ok = await onSave(built.job);
    setStatus(ok ? "Saved on this device." : "");
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="flex min-w-0 flex-col gap-4">
      <h3 className="font-display text-xl">Details</h3>
      <MainFields values={values} errors={errors} onChange={change} />
      <DetailFields values={values} errors={errors} onChange={change} country={country} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Save changes</Button>
        <p role="status" aria-live="polite" className="text-sm text-muted">
          {status}
        </p>
      </div>
    </form>
  );
}
