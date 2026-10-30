"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { BACKUP_MAX_BYTES, buildBackup, IMPORT_MESSAGES, parseBackup } from "@/lib/cv/backup";
import type { Cv } from "@/lib/cv/schema";
import {
  binCv,
  daysLeftInBin,
  deleteAllData,
  duplicateCv,
  listBin,
  listCvs,
  renameCv,
  replaceAllCvs,
  restoreCv,
  type BinEntry,
} from "@/lib/storage/cvStore";

type Load =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "ready"; all: Cv[]; bin: BinEntry[]; skipped: number };

type Confirm =
  | { kind: "delete"; cv: Cv }
  | { kind: "rename"; cv: Cv }
  | { kind: "import"; cvs: Cv[] }
  | { kind: "wipe" };

const STORAGE_FULL =
  "This device has no storage space left, so nothing was saved. Free some space and try again.";

const UNAVAILABLE =
  "Saving is not available in this browser, so we cannot show saved CVs. A private window can cause this.";

function label(cv: Cv): string {
  return cv.title.trim() || "Untitled";
}

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function fetchLoad(): Promise<Load> {
  const [cvs, bin] = await Promise.all([listCvs(), listBin(new Date())]);
  if (!cvs.ok || !bin.ok) return { state: "unavailable" };
  return { state: "ready", all: cvs.value.cvs, bin: bin.value, skipped: cvs.value.skipped };
}

export function CvListScreen({
  country,
  onOpen,
  onNew,
  onImport,
}: {
  country: CountryCode;
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: () => void;
}) {
  const doc = COUNTRY_INFO[country].cvName;
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  const refresh = useCallback(async () => setLoad(await fetchLoad()), []);

  useEffect(() => {
    let cancelled = false;
    void fetchLoad().then((next) => {
      if (!cancelled) setLoad(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Runs a storage action, then shows its outcome in plain words. */
  const run = async (
    action: () => Promise<{ ok: boolean; reason?: string }>,
    done: string,
    failed = "That did not work. Your CVs on this device were not changed.",
  ) => {
    setBusy(true);
    setProblem("");
    setMessage("");
    try {
      const result = await action();
      setConfirm(null);
      if (result.ok) setMessage(done);
      else if ("reason" in result && result.reason === "full") setProblem(STORAGE_FULL);
      else setProblem(failed);
      await refresh();
      if (result.ok) heading.current?.focus();
    } catch {
      setConfirm(null);
      setProblem(failed);
    } finally {
      setBusy(false);
    }
  };

  const exportAll = () => {
    if (load.state !== "ready") return;
    try {
      const blob = new Blob([buildBackup(load.all, new Date())], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `stepkite-cvs-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setProblem("");
      setMessage("Backup file saved. Keep it somewhere safe.");
    } catch {
      setProblem("We could not create the backup file. Try again.");
    }
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setMessage("");
    setProblem("");
    if (file.size > BACKUP_MAX_BYTES) {
      setProblem(IMPORT_MESSAGES["too-big"]);
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setProblem(IMPORT_MESSAGES["not-json"]);
      return;
    }
    const parsed = parseBackup(text, file.size);
    if (!parsed.ok) {
      setProblem(IMPORT_MESSAGES[parsed.error]);
      return;
    }
    setConfirm({ kind: "import", cvs: parsed.cvs });
  };

  if (load.state === "loading") {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <p className="sr-only" role="status">
          Loading your saved CVs
        </p>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const shown = load.state === "ready" ? load.all.filter((cv) => cv.country === country) : [];
  const bin = load.state === "ready" ? load.bin.filter((e) => e.cv.country === country) : [];
  const now = new Date();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 ref={heading} tabIndex={-1} className="font-display text-2xl outline-none">
          Your saved {doc}s
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNew}>Start a new {doc}</Button>
          <Button variant="secondary" data-cv-upload="" onClick={onImport}>
            Already have a {doc}? Upload it
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted">Your {doc} stays on this device.</p>

      <div className="flex flex-col gap-2">
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
        {problem ? (
          <p role="alert" className="text-sm text-danger">
            {problem}
          </p>
        ) : null}
        {load.state === "ready" && load.skipped > 0 ? (
          <p role="alert" className="text-sm text-danger">
            {load.skipped === 1
              ? "One saved CV could not be read, so it is not shown. It has not been deleted."
              : `${load.skipped} saved CVs could not be read, so they are not shown. None have been deleted.`}
          </p>
        ) : null}
      </div>

      {load.state === "unavailable" ? (
        <p role="alert" className="text-danger">
          {UNAVAILABLE}
        </p>
      ) : shown.length === 0 ? (
        <p className="text-muted">No saved {doc}s yet. Start one and it saves as you type.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((cv) => (
            <li key={cv.id}>
              <Card className="flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">{label(cv)}</p>
                  <p className="text-sm text-muted">Last changed {when(cv.updatedAt)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => onOpen(cv.id)} aria-label={`Open ${label(cv)}`}>
                    Open
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    aria-label={`Duplicate ${label(cv)}`}
                    onClick={() => void run(() => duplicateCv(cv.id, new Date()), "Copy made.")}
                  >
                    Duplicate
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`Rename ${label(cv)}`}
                    onClick={() => {
                      setName(cv.title);
                      setConfirm({ kind: "rename", cv });
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`Delete ${label(cv)}`}
                    onClick={() => setConfirm({ kind: "delete", cv })}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="cv-bin" className="flex flex-col gap-3">
        <h3 id="cv-bin" className="text-lg font-semibold">
          Recently deleted
        </h3>
        {bin.length === 0 ? (
          <p className="text-muted">Nothing deleted. A deleted {doc} stays here for 30 days.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {bin.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold [overflow-wrap:anywhere]">{label(entry.cv)}</p>
                  <p className="text-sm text-muted">
                    {daysLeftInBin(entry, now)} days left before it is erased
                  </p>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy}
                  aria-label={`Restore ${label(entry.cv)}`}
                  onClick={() => void run(() => restoreCv(entry.id), "Restored.")}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cv-backup" className="flex flex-col gap-3">
        <h3 id="cv-backup" className="text-lg font-semibold">
          Backup and your data
        </h3>
        <p className="text-sm text-muted">
          A backup is one file with all your CVs. It never leaves your device unless you move it.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={load.state !== "ready" || load.all.length === 0}
            onClick={exportAll}
          >
            Export all CVs
          </Button>
          <Button variant="secondary" onClick={() => fileInput.current?.click()}>
            Import CVs
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Choose a backup file"
            tabIndex={-1}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void chooseFile(file);
            }}
          />
          <Button variant="secondary" onClick={() => setConfirm({ kind: "wipe" })}>
            Delete my data
          </Button>
        </div>
      </section>

      <Dialog
        open={confirm?.kind === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete this CV?"
        description={
          confirm?.kind === "delete"
            ? `"${label(confirm.cv)}" moves to Recently deleted. You can restore it for 30 days.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Keep it
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirm?.kind === "delete") {
                  const id = confirm.cv.id;
                  void run(() => binCv(id, new Date()), "Moved to Recently deleted.");
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm?.kind === "rename"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Rename this CV"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirm?.kind === "rename") {
                  const id = confirm.cv.id;
                  void run(() => renameCv(id, name, new Date()), "Renamed.");
                }
              }}
            >
              Save name
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (confirm?.kind === "rename" && !busy) {
              const id = confirm.cv.id;
              void run(() => renameCv(id, name, new Date()), "Renamed.");
            }
          }}
        >
          <Input
            label="CV name"
            hint="For example Graduate UK."
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </form>
      </Dialog>
      <Dialog
        open={confirm?.kind === "import"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Replace the CVs on this device?"
        description={
          confirm?.kind === "import"
            ? `The file has ${confirm.cvs.length} ${confirm.cvs.length === 1 ? "CV" : "CVs"}. They replace what is saved here. Your current CVs go to Recently deleted for 30 days.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (confirm?.kind === "import") {
                  const cvs = confirm.cvs;
                  void run(
                    () => replaceAllCvs(cvs),
                    "Backup imported.",
                    "Some CVs could not be replaced. Your earlier CVs are in Recently deleted. Try again.",
                  );
                }
              }}
            >
              Replace
            </Button>
          </>
        }
      />
      <Dialog
        open={confirm?.kind === "wipe"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete all your data?"
        description="This erases every CV, earlier copy and deleted CV from this device. It cannot be undone. Export first if you want to keep a copy."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  deleteAllData,
                  "Everything was erased from this device.",
                  "We could not erase everything. Close other tabs of this site and try again.",
                )
              }
            >
              Delete everything
            </Button>
          </>
        }
      />
    </div>
  );
}
