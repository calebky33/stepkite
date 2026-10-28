"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { cvSchema, emptyCv, type Cv } from "@/lib/cv/schema";
import { readItem, writeItem } from "@/lib/storage/db";

const CV_ID = "default";
const AUTOSAVE_MS = 500;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_ERROR = "Use a year and month, like 2024-03.";

type SaveState = "empty" | "loaded" | "saving" | "saved" | "unavailable" | "unreadable" | "invalid";
type View = "edit" | "preview";

const textareaClass =
  "min-h-24 w-full min-w-0 rounded-input border border-border-strong bg-surface-2 px-3 py-2 text-base text-text";

function newId(): string {
  return crypto.randomUUID();
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function formatMonth(value: string | null, locale: string): string {
  if (!value || !MONTH_PATTERN.test(value)) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function skillsText(cv: Cv): string {
  return (cv.skills[0]?.items ?? []).join(", ");
}

export function CvBuilderShell({ country }: { country: CountryCode }) {
  const info = COUNTRY_INFO[country];
  const doc = info.cvName;
  const [cv, setCv] = useState<Cv | null>(null);
  const [skills, setSkills] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("empty");
  const [view, setView] = useState<View>("edit");
  const [rev, setRev] = useState(0);
  const latest = useRef<Cv | null>(null);
  const blocked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void readItem("cvs", CV_ID, cvSchema).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        latest.current = result.value;
        setCv(result.value);
        setSkills(skillsText(result.value));
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
    setSaveState((s) => (s === "unavailable" || s === "unreadable" ? s : "saving"));
    setRev((n) => n + 1);
  }, []);

  useEffect(() => {
    if (rev === 0 || blocked.current) return;
    const timer = setTimeout(() => {
      const current = latest.current;
      if (!current) return;
      const stamped = { ...current, updatedAt: new Date().toISOString() };
      void writeItem("cvs", CV_ID, cvSchema, stamped).then((result) => {
        if (result.ok) setSaveState("saved");
        else if (result.reason === "invalid") setSaveState("invalid");
        else setSaveState("unavailable");
      });
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [rev]);

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

  const setContact = (key: "fullName" | "email" | "phone" | "city", value: string) =>
    edit((d) => ({ ...d, contact: { ...d.contact, [key]: value } }));
  const setExperience = (id: string, patch: Partial<Cv["experience"][number]>) =>
    edit((d) => ({
      ...d,
      experience: d.experience.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  const setEducation = (id: string, patch: Partial<Cv["education"][number]>) =>
    edit((d) => ({
      ...d,
      education: d.education.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  const editor = (
    <div className="flex min-w-0 flex-col gap-8">
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Contact</h2>
        <Input
          label="Full name"
          autoComplete="name"
          maxLength={120}
          value={cv.contact.fullName}
          onChange={(e) => setContact("fullName", e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={cv.contact.email}
          onChange={(e) => setContact("email", e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          maxLength={32}
          value={cv.contact.phone}
          onChange={(e) => setContact("phone", e.target.value)}
        />
        <Input
          label="City"
          autoComplete="address-level2"
          maxLength={120}
          value={cv.contact.city}
          onChange={(e) => setContact("city", e.target.value)}
        />
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Summary</h2>
        <label htmlFor="cv-summary" className="text-sm font-semibold">
          Two or three lines about the work you do
        </label>
        <textarea
          id="cv-summary"
          aria-describedby="cv-summary-hint"
          className={textareaClass}
          maxLength={4000}
          value={cv.summary}
          onChange={(e) => edit((d) => ({ ...d, summary: e.target.value }))}
        />
        <p id="cv-summary-hint" className="text-sm text-muted">
          Name your role and one result you are proud of.
        </p>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Experience</h2>
        {cv.experience.length === 0 ? (
          <p className="text-muted">No jobs added yet. Add your most recent job first.</p>
        ) : null}
        {cv.experience.map((job, index) => {
          const startBad = !MONTH_PATTERN.test(job.start);
          const endBad = job.end !== null && !MONTH_PATTERN.test(job.end);
          return (
            <fieldset
              key={job.id}
              className="flex min-w-0 flex-col gap-4 border-t border-border pt-4"
            >
              <legend className="sr-only">Job {index + 1}</legend>
              <Input
                label="Job title"
                maxLength={120}
                value={job.role}
                onChange={(e) => setExperience(job.id, { role: e.target.value })}
              />
              <Input
                label="Employer"
                maxLength={120}
                value={job.employer}
                onChange={(e) => setExperience(job.id, { employer: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Start"
                  type="month"
                  value={job.start}
                  error={startBad ? "Choose a start month." : undefined}
                  onChange={(e) => setExperience(job.id, { start: e.target.value })}
                />
                <Input
                  label="End"
                  type="month"
                  hint="Leave empty if you still work here."
                  value={job.end ?? ""}
                  error={endBad ? MONTH_ERROR : undefined}
                  onChange={(e) => setExperience(job.id, { end: e.target.value || null })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor={`bullets-${job.id}`} className="text-sm font-semibold">
                  What you did, one line each
                </label>
                <textarea
                  id={`bullets-${job.id}`}
                  className={textareaClass}
                  value={job.bullets.join("\n")}
                  onChange={(e) => setExperience(job.id, { bullets: e.target.value.split("\n") })}
                />
              </div>
              <Button
                variant="secondary"
                className="self-start"
                onClick={() =>
                  edit((d) => ({ ...d, experience: d.experience.filter((x) => x.id !== job.id) }))
                }
              >
                <Trash2 aria-hidden="true" className="mr-2 size-4" />
                Remove job {index + 1}
              </Button>
            </fieldset>
          );
        })}
        <Button
          variant="secondary"
          className="self-start"
          onClick={() =>
            edit((d) => ({
              ...d,
              experience: [
                ...d.experience,
                {
                  id: newId(),
                  role: "",
                  employer: "",
                  location: "",
                  start: currentMonth(),
                  end: null,
                  bullets: [],
                },
              ],
            }))
          }
        >
          <Plus aria-hidden="true" className="mr-2 size-4" />
          Add a job
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Education</h2>
        {cv.education.length === 0 ? (
          <p className="text-muted">No education added yet. Add your highest qualification.</p>
        ) : null}
        {cv.education.map((item, index) => (
          <fieldset
            key={item.id}
            className="flex min-w-0 flex-col gap-4 border-t border-border pt-4"
          >
            <legend className="sr-only">Qualification {index + 1}</legend>
            <Input
              label="Qualification"
              maxLength={120}
              value={item.qualification}
              onChange={(e) => setEducation(item.id, { qualification: e.target.value })}
            />
            <Input
              label="School or university"
              maxLength={120}
              value={item.institution}
              onChange={(e) => setEducation(item.id, { institution: e.target.value })}
            />
            <Input
              label="Finished"
              type="month"
              hint="Leave empty if you have not finished."
              value={item.end ?? ""}
              error={item.end !== null && !MONTH_PATTERN.test(item.end) ? MONTH_ERROR : undefined}
              onChange={(e) => setEducation(item.id, { end: e.target.value || null })}
            />
            <Button
              variant="secondary"
              className="self-start"
              onClick={() =>
                edit((d) => ({ ...d, education: d.education.filter((x) => x.id !== item.id) }))
              }
            >
              <Trash2 aria-hidden="true" className="mr-2 size-4" />
              Remove qualification {index + 1}
            </Button>
          </fieldset>
        ))}
        <Button
          variant="secondary"
          className="self-start"
          onClick={() =>
            edit((d) => ({
              ...d,
              education: [
                ...d.education,
                {
                  id: newId(),
                  qualification: "",
                  institution: "",
                  start: null,
                  end: null,
                  details: "",
                },
              ],
            }))
          }
        >
          <Plus aria-hidden="true" className="mr-2 size-4" />
          Add a qualification
        </Button>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Skills</h2>
        <Input
          label="Skills"
          hint="Separate each skill with a comma."
          value={skills}
          onChange={(e) => {
            const text = e.target.value;
            setSkills(text);
            const items = text
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .slice(0, 40);
            edit((d) => ({
              ...d,
              skills: items.length
                ? [{ id: d.skills[0]?.id ?? newId(), label: "Skills", items }]
                : [],
            }));
          }}
        />
      </Card>
    </div>
  );

  const hasContent =
    cv.contact.fullName ||
    cv.contact.email ||
    cv.contact.phone ||
    cv.contact.city ||
    cv.summary ||
    cv.experience.length ||
    cv.education.length ||
    cv.skills.length;
  const contactBits = [cv.contact.email, cv.contact.phone, cv.contact.city].filter(Boolean);

  const preview = (
    <Card
      aria-label={`${doc} preview`}
      role="region"
      className="flex min-w-0 flex-col gap-4 [overflow-wrap:anywhere] md:sticky md:top-4"
    >
      {hasContent ? (
        <>
          {cv.contact.fullName ? (
            <h2 className="font-display text-2xl font-extrabold">{cv.contact.fullName}</h2>
          ) : null}
          {contactBits.length ? (
            <p className="flex flex-wrap gap-x-4 text-sm text-muted">
              {contactBits.map((bit) => (
                <span key={bit}>{bit}</span>
              ))}
            </p>
          ) : null}
          {cv.summary ? (
            <section aria-label="Summary" className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">Summary</h3>
              <p className="whitespace-pre-wrap">{cv.summary}</p>
            </section>
          ) : null}
          {cv.experience.length ? (
            <section aria-label="Experience" className="flex flex-col gap-3">
              <h3 className="text-base font-semibold">Experience</h3>
              {cv.experience.map((job) => (
                <div key={job.id} className="flex flex-col gap-1">
                  <p className="font-semibold">
                    {[job.role, job.employer].filter(Boolean).join(", ") || "Untitled job"}
                  </p>
                  <p className="text-sm text-muted">
                    {formatMonth(job.start, info.locale)} to{" "}
                    {job.end ? formatMonth(job.end, info.locale) : "present"}
                  </p>
                  <ul className="list-disc pl-5">
                    {job.bullets
                      .filter((b) => b.trim())
                      .map((b, i) => (
                        <li key={`${job.id}-${i}`}>{b}</li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
          {cv.education.length ? (
            <section aria-label="Education" className="flex flex-col gap-3">
              <h3 className="text-base font-semibold">Education</h3>
              {cv.education.map((item) => (
                <div key={item.id} className="flex flex-col gap-1">
                  <p className="font-semibold">
                    {[item.qualification, item.institution].filter(Boolean).join(", ") ||
                      "Untitled qualification"}
                  </p>
                  {item.end ? (
                    <p className="text-sm text-muted">{formatMonth(item.end, info.locale)}</p>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
          {cv.skills.length ? (
            <section aria-label="Skills" className="flex flex-col gap-1">
              <h3 className="text-base font-semibold">Skills</h3>
              <p>{cv.skills[0]?.items.join(", ")}</p>
            </section>
          ) : null}
        </>
      ) : (
        <p className="text-muted">Your {doc} appears here as you type.</p>
      )}
    </Card>
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          aria-live="polite"
          className={isError ? "min-h-6 text-danger" : "min-h-6 text-muted"}
        >
          {message[saveState]}
        </p>
        <div className="flex flex-col gap-1">
          <Button disabled aria-describedby="cv-export-reason">
            Download {doc}
          </Button>
          <p id="cv-export-reason" className="text-sm text-muted">
            PDF download is not ready yet.
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
      <div className="md:hidden">
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
      <div className="grid min-w-0 items-start gap-8 md:grid-cols-2">
        <div className={view === "edit" ? "block" : "hidden md:block"}>{editor}</div>
        <div className={view === "preview" ? "block" : "hidden md:block"}>{preview}</div>
      </div>
    </div>
  );
}
