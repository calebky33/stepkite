"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { applyDraft, buildDraft, type DraftUnit, type ImportDraft } from "@/lib/cv/import/draft";
import { extractText, type Progress } from "@/lib/cv/import/extract";
import { IMPORT_ERRORS, ImportError, MAX_FILE_BYTES } from "@/lib/cv/import/file";
import { cleanValue } from "@/lib/cv/import/sanitize";
import { newCvId, saveCv } from "@/lib/storage/cvStore";
import { ImportReview } from "./ImportReview";
import { newCv } from "./newCv";

type Step =
  | { name: "pick" }
  | { name: "reading"; progress: Progress }
  | { name: "error"; message: string }
  | { name: "review"; draft: ImportDraft; fileName: string; notes: string[] };

/** Choose a file, read it on this device, review it, then create a new CV. */
export function CvImportScreen({
  country,
  onCancel,
  onCreated,
}: {
  country: CountryCode;
  onCancel: () => void;
  onCreated: (cvId: string) => void;
}) {
  const doc = COUNTRY_INFO[country].cvName;
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const run = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const creating = useRef(false);
  const mounted = useRef(true);

  useEffect(() => heading.current?.focus(), [step.name]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(
    () => () => {
      run.current += 1;
      abort.current?.abort();
    },
    [],
  );

  /** Stops any reading in progress. Late results are ignored by the run counter. */
  const stopReading = () => {
    run.current += 1;
    abort.current?.abort();
    abort.current = null;
  };

  const choose = async (file: File | undefined) => {
    if (!file) return;
    stopReading();
    const mine = run.current;
    const controller = new AbortController();
    abort.current = controller;
    setStep({ name: "reading", progress: { step: "checking" } });
    try {
      const result = await extractText(
        file,
        (progress) => {
          if (run.current === mine) setStep({ name: "reading", progress });
        },
        controller.signal,
      );
      if (run.current !== mine) return;
      setStep({
        name: "review",
        draft: buildDraft(result.text),
        fileName: cleanValue(file.name, 80),
        notes: result.notes,
      });
    } catch (error) {
      if (run.current !== mine) return;
      const code = error instanceof ImportError ? error.code : "corrupted";
      setStep({ name: "error", message: IMPORT_ERRORS[code] });
    }
  };

  const confirm = async (units: DraftUnit[]) => {
    // Set before anything else, so a fast second click cannot start a second CV.
    if (creating.current) return;
    creating.current = true;
    // Stays set after a success. Only a failure lets the person try again.
    const created = await create(units).catch(() => false);
    if (!created) creating.current = false;
  };

  const create = async (units: DraftUnit[]): Promise<boolean> => {
    const now = new Date();
    const base = newCv(newCvId(), country, now.toISOString());
    const built = applyDraft(base, units, "Imported CV");
    if (!built.ok) {
      setSaveError("Some fields are too long or not valid. Check the fields and try again.");
      return false;
    }
    setSaving(true);
    setSaveError("");
    let ok = false;
    try {
      ok = (await saveCv(built.cv)).ok;
    } catch {
      ok = false;
    }
    if (!mounted.current) return ok;
    setSaving(false);
    if (ok) onCreated(built.cv.id);
    else setSaveError("We could not save on this device. Nothing was created. Try again.");
    return ok;
  };

  if (step.name === "review") {
    return (
      <ImportReview
        draft={step.draft}
        doc={doc}
        fileName={step.fileName}
        notes={step.notes}
        saving={saving}
        saveError={saveError}
        onConfirm={(units) => void confirm(units)}
        onCancel={onCancel}
      />
    );
  }

  const { progress } = step.name === "reading" ? step : { progress: undefined };
  const pages = progress?.pages;
  const page = progress?.page;
  return (
    <div
      className="flex max-w-prose flex-col gap-4"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || e.defaultPrevented) return;
        e.preventDefault();
        if (step.name === "reading") {
          stopReading();
          setStep({ name: "pick" });
        } else {
          onCancel();
        }
      }}
    >
      <h2 ref={heading} tabIndex={-1} className="font-display text-2xl outline-none">
        {step.name === "reading" ? "Reading your file" : `Upload your old ${doc}`}
      </h2>
      {step.name === "reading" ? (
        <Card className="flex flex-col gap-3" aria-busy="true">
          <p role="status">
            {pages && page ? `Reading page ${page} of ${pages}…` : "Reading your file…"}
          </p>
          <progress
            aria-label="Reading progress"
            className="w-full"
            {...(pages && page ? { value: page, max: pages } : {})}
          />
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => {
              stopReading();
              setStep({ name: "pick" });
            }}
          >
            Cancel
          </Button>
        </Card>
      ) : (
        <>
          <p className="text-muted">
            Choose a PDF, a Word file (.docx) or a text file, up to {MAX_FILE_BYTES / 1024 / 1024}{" "}
            MB. We read it on this device. The file is never uploaded.
          </p>
          {step.name === "error" ? (
            <p role="alert" className="rounded-input border border-danger px-3 py-2 text-danger">
              {step.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => input.current?.click()}>Choose a file</Button>
            <Button variant="secondary" onClick={onCancel}>
              Back
            </Button>
          </div>
          <input
            ref={input}
            type="file"
            accept=".pdf,.docx,.txt"
            aria-label={`Choose your old ${doc} file`}
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void choose(file);
            }}
          />
        </>
      )}
    </div>
  );
}
