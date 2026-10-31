"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  CSV_ERROR_MESSAGES,
  CSV_FIELDS,
  CSV_FIELD_LABELS,
  CSV_MAX_BYTES,
  importPreview,
  parseCsvDetailed,
  type CsvMapping,
} from "@/lib/tracker/csv";
import type { Job, StageRecord } from "@/lib/tracker/schema";
import { NativeSelect } from "./fields";
import { readFileText } from "./download";

/** "Imported X of Y, Z skipped." once done, "X of Y rows are ready" before. */
function summaryText(imported: number, total: number, skipped: number, when: "ready" | "done") {
  const tail = skipped > 0 ? `, ${skipped} skipped` : "";
  return when === "done"
    ? `Imported ${imported} of ${total}${tail}.`
    : `${imported} of ${total} ${total === 1 ? "row is" : "rows are"} ready to import${tail}.`;
}

const SHOWN_ERRORS = 10;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Matches a header such as "Job title" to a field by name. */
function guess(header: readonly string[]): CsvMapping {
  const mapping: CsvMapping = {};
  for (const field of CSV_FIELDS) {
    const wanted = [norm(field), norm(CSV_FIELD_LABELS[field])];
    const at = header.findIndex((h) => wanted.includes(norm(h)));
    if (at >= 0) mapping[field] = at;
  }
  return mapping;
}

type Parsed = { rows: string[][]; now: string; skippedBlank: number };

type Props = {
  stages: readonly StageRecord[];
  /** The pay currency used when a row has pay but no currency. */
  currency: string;
  onImport: (jobs: Job[], summary: string) => void;
};

export function ImportCsv({ stages, currency, onImport }: Props) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () =>
      parsed
        ? importPreview(parsed.rows.slice(1), mapping, {
            stages,
            now: parsed.now,
            newId: () => crypto.randomUUID(),
            defaultCurrency: currency,
            headerWidth: parsed.rows[0]?.length,
            skippedBlank: parsed.skippedBlank,
          })
        : null,
    [parsed, mapping, stages, currency],
  );

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    if (file.size > CSV_MAX_BYTES) {
      setMessage(CSV_ERROR_MESSAGES["too-big"]);
      return;
    }
    setBusy(true);
    try {
      const text = await readFileText(file);
      const result = parseCsvDetailed(text, file.size);
      if (!result.ok) {
        setMessage(CSV_ERROR_MESSAGES[result.error]);
      } else if (result.value.rows.length < 2) {
        setMessage("That file has no jobs in it. The first row must be the column names.");
      } else {
        setParsed({
          rows: result.value.rows,
          now: new Date().toISOString(),
          skippedBlank: result.value.skippedBlank,
        });
        setMapping(guess(result.value.rows[0] ?? []));
      }
    } catch {
      setMessage("We could not read that file. Try saving it as a CSV again.");
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setParsed(null);
    setMapping({});
    setMessage("");
  }

  const header = parsed?.rows[0] ?? [];
  const options = [
    { value: "-1", label: "Not in my file" },
    ...header.map((h, i) => ({ value: String(i), label: h.trim() === "" ? `Column ${i + 1}` : h })),
  ];

  return (
    <section aria-labelledby="import-csv-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="import-csv-heading" className="font-display text-xl">
        Import jobs from a spreadsheet
      </h3>
      {!parsed || !preview ? (
        <>
          <p className="max-w-prose text-muted">
            Choose a CSV file with one job on each row. The first row holds the column names. You
            match the columns and see a preview before anything is added.
          </p>
          <Field label="CSV file" labelAs="label">
            {(c) => (
              <input
                id={c.id}
                type="file"
                accept=".csv,text/csv"
                aria-describedby={c["aria-describedby"]}
                disabled={busy}
                onChange={(e) => void choose(e)}
                className="min-h-11 w-full text-base"
              />
            )}
          </Field>
        </>
      ) : (
        <div className="flex min-w-0 flex-col gap-6">
          <fieldset className="grid min-w-0 gap-4 md:grid-cols-2">
            <legend className="mb-2 text-base font-semibold">Match your columns</legend>
            <p className="text-sm text-muted md:col-span-2">
              Title and company are needed on every row.
            </p>
            {CSV_FIELDS.map((field) => (
              <NativeSelect
                key={field}
                label={`Column for ${CSV_FIELD_LABELS[field]}`}
                value={String(mapping[field] ?? -1)}
                options={options}
                onChange={(e) => {
                  const at = Number(e.target.value);
                  setMapping((m) => ({ ...m, [field]: at >= 0 ? at : undefined }));
                }}
              />
            ))}
          </fieldset>
          <div aria-live="polite" className="flex flex-col gap-3">
            <p className="font-semibold">
              {summaryText(preview.imported, preview.total, preview.skipped, "ready")}
            </p>
            <Notes
              title="Skipped rows are not imported. Fix them in your file and import again."
              items={preview.errors.map((e) => e.message)}
            />
            <Notes
              title="Worth a look. These rows are imported."
              items={preview.warnings.map((w) => w.message)}
            />
            {preview.defaulted.stage > 0 ? (
              <p className="text-sm text-muted">
                {`${preview.defaulted.stage} ${preview.defaulted.stage === 1 ? "row has" : "rows have"} no known stage, so they go in your first Saved stage.`}
              </p>
            ) : null}
            {preview.defaulted.currency > 0 ? (
              <p className="text-sm text-muted">
                {`${preview.defaulted.currency} ${preview.defaulted.currency === 1 ? "row had" : "rows had"} no currency, so we used ${currency}.`}
              </p>
            ) : null}
            {preview.defaulted.period > 0 ? (
              <p className="text-sm text-muted">
                {`${preview.defaulted.period} ${preview.defaulted.period === 1 ? "row had" : "rows had"} no pay period, so we used annual.`}
              </p>
            ) : null}
            {preview.skippedBlank > 0 ? (
              <p className="text-sm text-muted">{`${preview.skippedBlank} blank lines were left out.`}</p>
            ) : null}
            {preview.jobs.length > 0 ? (
              <ul className="divide-y divide-border rounded-card border border-border bg-surface px-4">
                {preview.jobs.slice(0, 5).map((j) => (
                  <li key={j.id} className="py-2 [overflow-wrap:anywhere]">
                    <span className="font-semibold">{j.title}</span>
                    {`, ${j.company}`}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={preview.imported === 0}
              onClick={() => {
                onImport(
                  preview.jobs,
                  summaryText(preview.imported, preview.total, preview.skipped, "done"),
                );
                cancel();
              }}
            >
              {`Import ${preview.imported} ${preview.imported === 1 ? "job" : "jobs"}`}
            </Button>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {message ? (
        <p role="alert" className="text-danger">
          {message}
        </p>
      ) : null}
    </section>
  );
}

/** A short list of messages, capped so a bad file cannot flood the page. */
function Notes({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-muted">{title}</p>
      <ul className="mt-2 list-disc ps-5 text-sm">
        {items.slice(0, SHOWN_ERRORS).map((m, i) => (
          <li key={`${i}-${m}`}>{m}</li>
        ))}
      </ul>
      {items.length > SHOWN_ERRORS ? (
        <p className="mt-1 text-sm text-muted">{`And ${items.length - SHOWN_ERRORS} more.`}</p>
      ) : null}
    </div>
  );
}
