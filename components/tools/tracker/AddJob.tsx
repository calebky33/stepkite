"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import type { Job } from "@/lib/tracker/schema";
import { DetailFields, MainFields } from "./JobFields";
import { TextArea } from "./fields";
import { buildJob, emptyValues, type JobErrors, type JobValues } from "./jobForm";
import { READ_LINK_NOTICE, READ_MESSAGES, TITLE_CHECK_HINT, readLink } from "./previewClient";

type Mode = "form" | "text" | "link";
type Reading = { state: "idle" | "reading" | "found" | "failed"; message: string };

const MAIN_KEYS = ["title", "company", "url"];

const MODES = [
  { value: "form" as const, label: "Fill in" },
  { value: "text" as const, label: "Paste text" },
  { value: "link" as const, label: "Read link" },
];

type Props = { country: CountryCode; stageId: string; onAdd: (job: Job) => void };

export function AddJob({ country, stageId, onAdd }: Props) {
  const currency = COUNTRY_INFO[country].currency;
  const [mode, setMode] = useState<Mode>("form");
  const [values, setValues] = useState<JobValues>(() => emptyValues(currency));
  const [errors, setErrors] = useState<JobErrors>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [reading, setReading] = useState<Reading>({ state: "idle", message: "" });

  // A new read invalidates earlier ones. Only the latest request can touch the form.
  const readId = useRef(0);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => inflight.current?.abort();
  }, []);

  const change = (patch: Partial<JobValues>) => setValues((v) => ({ ...v, ...patch }));

  async function read() {
    const url = values.url.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setErrors((e) => ({ ...e, url: "Enter a full link that starts with http or https." }));
      return;
    }
    setErrors((e) => ({ ...e, url: undefined }));
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    const id = ++readId.current;
    setReading({ state: "reading", message: "Reading the page." });
    const result = await readLink(url, fetch, controller.signal);
    // A later read replaced this one, so throw away what came back.
    if (id !== readId.current) return;
    if (!result.ok) {
      setReading({ state: "failed", message: READ_MESSAGES[result.reason] });
      return;
    }
    // Only fill fields that are still empty so typing after the read is not overwritten.
    setValues((v) => ({
      ...v,
      title: v.title.trim() === "" && result.title ? result.title : v.title,
      company: v.company.trim() === "" && result.company ? result.company : v.company,
    }));
    setReading({
      state: "found",
      message: `We found these on the page. They are only suggestions, so check them and edit.${
        result.titleSource === "title" ? ` ${TITLE_CHECK_HINT}` : ""
      }`,
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    const built = buildJob(values, { id: crypto.randomUUID(), stageId }, now);
    if (!built.ok) {
      setErrors(built.errors);
      if (Object.keys(built.errors).some((k) => !MAIN_KEYS.includes(k))) setMoreOpen(true);
      return;
    }
    setErrors({});
    setReading({ state: "idle", message: "" });
    setValues(emptyValues(currency));
    onAdd(built.job);
  }

  // Enter in the URL field reads the link instead of submitting the "Add job" form.
  function onUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void read();
    }
  }

  return (
    <Card className="md:p-8">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <h2 className="font-display text-[22px] leading-tight">Add a job</h2>
        <SegmentedControl
          label="How do you want to add it?"
          options={MODES}
          value={mode}
          onValueChange={setMode}
        />
        {mode === "link" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="min-w-0 md:flex-1">
                <Input
                  label="Link to the job ad"
                  type="url"
                  inputMode="url"
                  value={values.url}
                  error={errors.url}
                  onChange={(e) => change({ url: e.target.value })}
                  onKeyDown={onUrlKeyDown}
                />
              </div>
              <Button
                variant="secondary"
                loading={reading.state === "reading"}
                onClick={() => void read()}
                className="md:shrink-0"
              >
                Read the link
              </Button>
            </div>
            <p className="text-sm text-muted">{READ_LINK_NOTICE}</p>
            <p
              role={reading.state === "failed" ? "alert" : "status"}
              aria-live="polite"
              className={
                reading.state === "failed" ? "text-sm text-danger" : "min-h-5 text-sm text-muted"
              }
            >
              {reading.message}
            </p>
          </div>
        ) : null}
        <MainFields values={values} errors={errors} onChange={change} hideUrl={mode === "link"} />
        {mode === "text" ? (
          <TextArea
            label="Job text"
            hint="Optional. We save it in the notes and do not read it, so type the title and company above."
            value={values.notes}
            error={errors.notes}
            onChange={(e) => change({ notes: e.target.value })}
            className="min-h-40"
          />
        ) : null}
        <details
          open={moreOpen}
          onToggle={(e) => setMoreOpen(e.currentTarget.open)}
          className="rounded-card border border-border"
        >
          <summary className="flex min-h-11 cursor-pointer items-center px-4 text-base font-semibold">
            More details
          </summary>
          <div className="px-4 pb-4 pt-2">
            <DetailFields
              values={values}
              errors={errors}
              onChange={change}
              hideNotes={mode === "text"}
            />
          </div>
        </details>
        <Button type="submit" className="self-start">
          Add job
        </Button>
      </form>
    </Card>
  );
}
