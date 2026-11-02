"use client";

import { Redo2, Undo2 } from "lucide-react";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBillingMe } from "@/lib/billing/useBillingMe";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { checkAts } from "@/lib/cv/ats";
import type { Cv } from "@/lib/cv/schema";
import { getCvRules } from "@/lib/cv/rules";
import type { SnapshotCopy } from "@/lib/cv/snapshots";
import { duplicateCv, listSnapshots } from "@/lib/storage/cvStore";
import { CertificationsEditor } from "./editor/CertificationsEditor";
import { ContactEditor } from "./editor/ContactEditor";
import { EducationEditor } from "./editor/EducationEditor";
import { ExperienceEditor } from "./editor/ExperienceEditor";
import { ImpactEditor } from "./editor/ImpactEditor";
import { InterestsEditor } from "./editor/InterestsEditor";
import { ReferencesEditor } from "./editor/ReferencesEditor";
import { SectionOrderEditor } from "./editor/SectionOrderEditor";
import { SkillsEditor } from "./editor/SkillsEditor";
import { SummaryEditor } from "./editor/SummaryEditor";
import { AtsPanel, sectionDomId } from "./AtsPanel";
import { PagedPreview } from "./PagedPreview";
import { PdfDownload } from "./PdfDownload";
import { TemplatePicker } from "./TemplatePicker";
import { useCvDocument, type SaveState } from "./useCvDocument";

const MCertifications = memo(CertificationsEditor);
const MContact = memo(ContactEditor);
const MEducation = memo(EducationEditor);
const MExperience = memo(ExperienceEditor);
const MImpact = memo(ImpactEditor);
const MInterests = memo(InterestsEditor);
const MReferences = memo(ReferencesEditor);
const MSectionOrder = memo(SectionOrderEditor);
const MSkills = memo(SkillsEditor);
const MSummary = memo(SummaryEditor);

type View = "edit" | "preview";
type Copies =
  { state: "loading" } | { state: "error" } | { state: "ready"; copies: SnapshotCopy[] };

const MESSAGES: Record<SaveState, string> = {
  empty: "Nothing saved yet. Your changes save on this device as you type.",
  loaded: "Loaded from this device.",
  saving: "Saving…",
  saved: "Saved on this device",
  unavailable:
    "Saving is not available in this browser. Your changes stay on this page until you close it. A private window can cause this.",
  unreadable: "We could not read the saved version, so nothing is saved yet.",
  invalid: "Not saved. Check the fields marked in red.",
};

export function CvEditorScreen({
  country,
  cvId,
  onShowList,
  onImport,
  sandbox = false,
  onSaveOrExport,
}: {
  country: CountryCode;
  cvId: string;
  onShowList: () => void;
  onImport: () => void;
  /** Anonymous mode: draft lives in localStorage, no versions, no snapshots, no list. */
  sandbox?: boolean;
  /** Called when the user clicks Save now or Download PDF. The anonymous shell uses this to
   *  mount the sign-up banner. */
  onSaveOrExport?: () => void;
}) {
  const doc = COUNTRY_INFO[country].cvName;
  const billing = useBillingMe();
  const { cv, saveState, edit, undo, redo, canUndo, canRedo, saveNow, replaceWith, startNew } =
    useCvDocument(country, cvId, sandbox);
  const [view, setView] = useState<View>("edit");
  const [dialog, setDialog] = useState<"version" | "copies" | null>(null);
  const [versionName, setVersionName] = useState("");
  const [note, setNote] = useState("");
  const [copies, setCopies] = useState<Copies>({ state: "loading" });
  const printRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const previewCv = useDeferredValue(cv);
  const copiesRun = useRef(0);
  const [versionError, setVersionError] = useState("");
  useEffect(
    () => () => {
      copiesRun.current += 1;
    },
    [],
  );
  const [layout, setLayout] = useState<{ pages: number; empty: boolean } | null>(null);
  const onLayout = useCallback((info: { pages: number; empty: boolean }) => {
    setLayout((prev) =>
      prev && prev.pages === info.pages && prev.empty === info.empty ? prev : info,
    );
  }, []);
  const rules = getCvRules(country);
  const onContact = useCallback(
    (key: keyof Cv["contact"], value: string) =>
      edit((d) => ({ ...d, contact: { ...d.contact, [key]: value } })),
    [edit],
  );
  const onSummary = useCallback(
    (summary: Cv["summary"]) => edit((d) => ({ ...d, summary })),
    [edit],
  );
  const onExperience = useCallback(
    (experience: Cv["experience"]) => edit((d) => ({ ...d, experience })),
    [edit],
  );
  const onImpact = useCallback((impact: Cv["impact"]) => edit((d) => ({ ...d, impact })), [edit]);
  const onEducation = useCallback(
    (education: Cv["education"]) => edit((d) => ({ ...d, education })),
    [edit],
  );
  const onSkills = useCallback((skills: Cv["skills"]) => edit((d) => ({ ...d, skills })), [edit]);
  const onCertifications = useCallback(
    (certifications: Cv["certifications"]) => edit((d) => ({ ...d, certifications })),
    [edit],
  );
  const onInterests = useCallback(
    (interests: Cv["interests"]) => edit((d) => ({ ...d, interests })),
    [edit],
  );
  const onReferences = useCallback(
    (references: Cv["references"]) => edit((d) => ({ ...d, references })),
    [edit],
  );
  const onOrder = useCallback(
    (sectionOrder: Cv["sectionOrder"]) => edit((d) => ({ ...d, sectionOrder })),
    [edit],
  );
  const report = useMemo(
    () =>
      cv ? checkAts({ cv, rules, pageCount: layout && !layout.empty ? layout.pages : null }) : null,
    [cv, rules, layout],
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

  const isError =
    saveState === "unavailable" || saveState === "unreadable" || saveState === "invalid";

  const openCopies = () => {
    copiesRun.current += 1;
    const mine = copiesRun.current;
    setCopies({ state: "loading" });
    setDialog("copies");
    listSnapshots(cvId)
      .then((result) => {
        if (copiesRun.current !== mine) return;
        setCopies(
          result.ok
            ? { state: "ready", copies: [...result.value.copies].reverse() }
            : { state: "error" },
        );
      })
      .catch(() => {
        if (copiesRun.current === mine) setCopies({ state: "error" });
      });
  };

  const saveVersion = async () => {
    const name = versionName.trim();
    if (!name) return;
    setVersionError("");
    try {
      await saveNow();
      const result = await duplicateCv(cvId, new Date(), name);
      if (result.ok) {
        setDialog(null);
        setNote(`Saved as "${name}". Find it under My ${doc}s.`);
      } else {
        setVersionError(
          result.reason === "full"
            ? "This device has no storage space left. Free some space and try again."
            : `We could not save that version. Your current ${doc} is not affected.`,
        );
      }
    } catch {
      setVersionError(`We could not save that version. Your current ${doc} is not affected.`);
    }
  };

  const editor = (
    <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <Input
          label={`Name of this ${doc}`}
          hint="For example Graduate UK. Only you see it."
          maxLength={120}
          value={cv.title}
          onChange={(e) => edit((d) => ({ ...d, title: e.target.value }))}
        />
      </Card>
      <Card id={sectionDomId("layout")}>
        <TemplatePicker
          country={country}
          value={cv.templateId}
          onChange={(id) => edit((d) => ({ ...d, templateId: id }))}
        />
      </Card>
      <div id={sectionDomId("contact")}>
        <MContact contact={cv.contact} onChange={onContact} />
      </div>
      <div id={sectionDomId("summary")}>
        <MSummary value={cv.summary} onChange={onSummary} />
      </div>
      <div id={sectionDomId("experience")}>
        <MExperience items={cv.experience} onChange={onExperience} />
      </div>
      <div id={sectionDomId("impact")}>
        <MImpact items={cv.impact} onChange={onImpact} />
      </div>
      <div id={sectionDomId("education")}>
        <MEducation items={cv.education} onChange={onEducation} />
      </div>
      <div id={sectionDomId("skills")}>
        <MSkills items={cv.skills} onChange={onSkills} />
      </div>
      <div id={sectionDomId("certifications")}>
        <MCertifications doc={doc} items={cv.certifications} onChange={onCertifications} />
      </div>
      <div id={sectionDomId("interests")}>
        <MInterests doc={doc} value={cv.interests} onChange={onInterests} />
      </div>
      <div id={sectionDomId("references")}>
        <MReferences items={cv.references} onChange={onReferences} />
      </div>
      {report ? <AtsPanel report={report} doc={doc} /> : null}
      <MSectionOrder doc={doc} order={cv.sectionOrder} onChange={onOrder} />
    </div>
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Reserved height so the message never pushes the page down. */}
          <div className="min-h-12">
            <p
              role="status"
              aria-live={isError ? "assertive" : "off"}
              className={isError ? "text-sm text-danger" : "text-sm text-muted"}
            >
              {MESSAGES[saveState]}
            </p>
            <p aria-live="polite" className="sr-only">
              {saveState === "saved" ? "Saved" : ""}
            </p>
            <p className="text-sm text-muted">Your {doc} stays on this device.</p>
          </div>
          <PdfDownload
            contentRef={printRef}
            cvId={cvId}
            title={cv.title}
            onPrintingChange={setPrinting}
            fullName={cv.contact.fullName}
            rules={rules}
            disabledReason={
              layout?.empty
                ? `Add your name or a section first. The preview is only an example.`
                : null
            }
            onStart={onSaveOrExport}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IconButton
            label="Undo"
            icon={<Undo2 size={20} />}
            variant="secondary"
            disabled={!canUndo}
            onClick={undo}
          />
          <IconButton
            label="Redo"
            icon={<Redo2 size={20} />}
            variant="secondary"
            disabled={!canRedo}
            onClick={redo}
          />
          <Button
            variant="secondary"
            onClick={() => {
              onSaveOrExport?.();
              void saveNow();
            }}
          >
            Save now
          </Button>
          {sandbox ? null : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setVersionName(cv.title ? `${cv.title} copy` : "");
                  setVersionError("");
                  setDialog("version");
                }}
              >
                Save as a named version
              </Button>
              <Button variant="secondary" onClick={openCopies}>
                Earlier copies
              </Button>
              <Button variant="secondary" onClick={onShowList}>
                My {doc}s
              </Button>
            </>
          )}
        </div>
        <p aria-live="polite" className="text-sm">
          {note}
        </p>
        {sandbox ? null : (
          <p className="text-sm">
            Already have a {doc}?{" "}
            <button
              type="button"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline"
              data-cv-upload=""
              onClick={onImport}
            >
              Upload it
            </button>
          </p>
        )}
      </div>
      {saveState === "unreadable" ? (
        <Button variant="secondary" className="self-start" onClick={startNew}>
          Start a new {doc}
        </Button>
      ) : null}
      <div className="sticky top-[var(--header-h)] z-20 -mx-1 border-b border-border bg-bg px-1 py-2 md:hidden">
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
      <div className="relative grid min-w-0 items-start gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={view === "edit" ? "block min-w-0" : "hidden min-w-0 md:block"}>
          {editor}
        </div>
        <div
          className={
            view === "preview"
              ? "block min-w-0 md:sticky md:top-[calc(var(--header-h)+1rem)] md:max-h-[calc(100dvh-var(--header-h)-2rem)] md:overflow-y-auto"
              : "invisible absolute left-0 top-0 h-0 w-full min-w-0 overflow-hidden md:visible md:sticky md:top-[calc(var(--header-h)+1rem)] md:block md:h-auto md:max-h-[calc(100dvh-var(--header-h)-2rem)] md:overflow-y-auto"
          }
        >
          <PagedPreview
            cv={previewCv ?? cv}
            printing={printing}
            country={country}
            printRef={printRef}
            onLayout={onLayout}
            watermark={!billing.isPro}
          />
        </div>
      </div>

      <Dialog
        open={dialog === "version"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Save as a named version"
        description="Makes a separate copy you can edit on its own, like one for a graduate role and one for a data role."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button disabled={!versionName.trim()} onClick={() => void saveVersion()}>
              Save version
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void saveVersion();
          }}
        >
          <Input
            label="Version name"
            hint="For example Graduate UK."
            maxLength={120}
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
          {versionError ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {versionError}
            </p>
          ) : null}
        </form>
      </Dialog>
      <Dialog
        open={dialog === "copies"}
        onOpenChange={(open) => !open && setDialog(null)}
        title="Earlier copies"
        description="About one copy is kept for every five minutes you edit, up to ten. Restoring one is a change you can undo."
        footer={
          <Button variant="secondary" onClick={() => setDialog(null)}>
            Close
          </Button>
        }
      >
        {copies.state === "loading" ? (
          <Skeleton className="h-16 w-full" />
        ) : copies.state === "error" ? (
          <p role="alert" className="text-danger">
            We could not read the earlier copies on this device.
          </p>
        ) : copies.copies.length === 0 ? (
          <p className="text-muted">No earlier copies yet. They appear as you keep editing.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {copies.copies.map((copy) => {
              const label = new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(copy.at));
              return (
                <li key={copy.at} className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <Button
                    variant="secondary"
                    aria-label={`Restore the copy from ${label}`}
                    onClick={() => {
                      replaceWith({ ...copy.cv, id: cvId });
                      setDialog(null);
                    }}
                  >
                    Restore
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog>
    </div>
  );
}
