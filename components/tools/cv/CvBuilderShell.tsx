"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { cvSchema, emptyCv, type Cv } from "@/lib/cv/schema";
import { clampStyle } from "@/lib/cv/style";
import { readItem, writeItem } from "@/lib/storage/db";
import { ContactEditor } from "./editor/ContactEditor";
import { EducationEditor } from "./editor/EducationEditor";
import { ExperienceEditor } from "./editor/ExperienceEditor";
import { ImpactEditor } from "./editor/ImpactEditor";
import { SkillsEditor } from "./editor/SkillsEditor";
import { SummaryEditor } from "./editor/SummaryEditor";
import { PagedPreview } from "./PagedPreview";
import { TemplatePicker } from "./TemplatePicker";

const CV_ID = "default";
const AUTOSAVE_MS = 500;

type SaveState = "empty" | "loaded" | "saving" | "saved" | "unavailable" | "unreadable" | "invalid";
type View = "edit" | "preview";

export function CvBuilderShell({ country }: { country: CountryCode }) {
  const info = COUNTRY_INFO[country];
  const doc = info.cvName;
  const [cv, setCv] = useState<Cv | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("empty");
  const [view, setView] = useState<View>("edit");
  const [rev, setRev] = useState(0);
  const latest = useRef<Cv | null>(null);
  const blocked = useRef(false);
  // True from an edit until its save starts, so leaving the page never drops the last edit.
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void readItem("cvs", CV_ID, cvSchema).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        const loaded = { ...result.value, style: clampStyle(result.value.style) };
        latest.current = loaded;
        setCv(loaded);
        setSaveState("loaded");
        return;
      }
      const fresh = emptyCv(CV_ID, country, new Date().toISOString());
      latest.current = fresh;
      setCv(fresh);
      if (result.reason === "invalid") {
        blocked.current = true;
        setSaveState("unreadable");
      } else if (result.reason === "unavailable") setSaveState("unavailable");
      else setSaveState("empty");
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const edit = useCallback((change: (draft: Cv) => Cv) => {
    setCv((current) => {
      if (!current) return current;
      const next = change(current);
      latest.current = next;
      return next;
    });
    dirty.current = true;
    setSaveState((s) => (s === "unavailable" || s === "unreadable" ? s : "saving"));
    setRev((n) => n + 1);
  }, []);

  useEffect(() => {
    if (rev === 0 || blocked.current) return;
    const timer = setTimeout(() => {
      const current = latest.current;
      if (!current) return;
      const stamped = {
        ...current,
        style: clampStyle(current.style),
        updatedAt: new Date().toISOString(),
      };
      dirty.current = false;
      void writeItem("cvs", CV_ID, cvSchema, stamped).then((result) => {
        if (result.ok) setSaveState("saved");
        else if (result.reason === "invalid") setSaveState("invalid");
        else setSaveState("unavailable");
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [rev]);

  // Leaving the page inside the debounce window: save the last edit now.
  useEffect(
    () => () => {
      const current = latest.current;
      if (!dirty.current || blocked.current || !current) return;
      void writeItem("cvs", CV_ID, cvSchema, {
        ...current,
        style: clampStyle(current.style),
        updatedAt: new Date().toISOString(),
      });
    },
    [],
  );

  if (!cv) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <p className="sr-only" role="status">
          Loading your {doc}
        </p>
        <Skeleton className="h-11 w-full max-w-xs" />
        <Skeleton className="h-11 w-full max-w-xs" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const canSave = saveState !== "unreadable";
  const message: Record<SaveState, string> = {
    empty: "Nothing saved yet. Your changes save on this device as you type.",
    loaded: "Loaded from this device.",
    saving: "Saving…",
    saved: "Saved on this device",
    unavailable:
      "Saving is not available in this browser. Your changes stay on this page until you close it. A private window can cause this.",
    unreadable: "We could not read the saved version, so nothing is saved yet.",
    invalid: "Not saved. Check the fields marked in red.",
  };
  const isError =
    saveState === "unavailable" || saveState === "unreadable" || saveState === "invalid";

  const editor = (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <TemplatePicker
          country={country}
          value={cv.templateId}
          onChange={(id) => edit((d) => ({ ...d, templateId: id }))}
        />
      </Card>
      <ContactEditor
        contact={cv.contact}
        onChange={(key, value) => edit((d) => ({ ...d, contact: { ...d.contact, [key]: value } }))}
      />
      <SummaryEditor value={cv.summary} onChange={(summary) => edit((d) => ({ ...d, summary }))} />
      <ExperienceEditor
        items={cv.experience}
        onChange={(experience) => edit((d) => ({ ...d, experience }))}
      />
      <ImpactEditor items={cv.impact} onChange={(impact) => edit((d) => ({ ...d, impact }))} />
      <EducationEditor
        items={cv.education}
        onChange={(education) => edit((d) => ({ ...d, education }))}
      />
      <SkillsEditor items={cv.skills} onChange={(skills) => edit((d) => ({ ...d, skills }))} />
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {/* Reserved height so the message never pushes the page down. */}
        <p
          role="status"
          aria-live="polite"
          className={isError ? "min-h-12 text-danger" : "min-h-12 text-muted"}
        >
          {message[saveState]}
        </p>
        <div className="flex flex-col gap-1 sm:items-end">
          <Button disabled aria-describedby="cv-export-reason">
            Download {doc}
          </Button>
          <p id="cv-export-reason" className="text-sm text-muted">
            PDF download is not connected yet.
          </p>
        </div>
      </div>
      {!canSave ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            blocked.current = false;
            setSaveState("empty");
          }}
        >
          Start a new {doc}
        </Button>
      ) : null}
      <div className="sticky top-0 z-10 -mx-1 bg-bg px-1 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
        <SegmentedControl
          label="View"
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: "Preview" },
          ]}
          value={view}
          onValueChange={setView}
        />
      </div>
      <div className="grid min-w-0 items-start gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={view === "edit" ? "block min-w-0" : "hidden min-w-0 md:block"}>
          {editor}
        </div>
        <div
          className={
            view === "preview"
              ? "block min-w-0 md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto"
              : "hidden min-w-0 md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:overflow-y-auto md:block"
          }
        >
          <PagedPreview cv={cv} country={country} />
        </div>
      </div>
    </div>
  );
}
