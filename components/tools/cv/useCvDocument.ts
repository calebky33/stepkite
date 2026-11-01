"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CountryCode } from "@/lib/countries";
import {
  canRedo,
  canUndo,
  recordEdit,
  redo as redoHistory,
  startHistory,
  undo as undoHistory,
  type History,
} from "@/lib/cv/history";
import { storedCvSchema, type Cv } from "@/lib/cv/schema";
import { readSandboxDraft, writeSandboxDraft } from "@/lib/cv/sandbox";
import { clampStyle } from "@/lib/cv/style";
import { maybeSnapshot, saveCv } from "@/lib/storage/cvStore";
import { readItem } from "@/lib/storage/db";
import type { StorageResult } from "@/lib/storage/db";
import { newCv, prepareLoaded } from "./newCv";

export const AUTOSAVE_MS = 500;

export type SaveState =
  "empty" | "loaded" | "saving" | "saved" | "unavailable" | "unreadable" | "invalid";

/**
 * Loads one CV from the device and keeps it saved. Edits wait 500 ms, then write. Save now,
 * hiding the tab and leaving the page all write straight away, so closing the tab mid edit
 * loses nothing. Undo and redo keep the last 50 changes in memory only.
 *
 * `sandbox: true` is used by the anonymous CV editor. In sandbox mode the draft reads from and
 * writes to localStorage through lib/cv/sandbox.ts instead of IndexedDB, and no snapshots are
 * kept (there is only one draft and it moves to the account on sign-up).
 */
export function useCvDocument(country: CountryCode, cvId: string, sandbox = false) {
  const [history, setHistory] = useState<History<Cv> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("empty");
  const historyRef = useRef<History<Cv> | null>(null);
  const latest = useRef<Cv | null>(null);
  const blocked = useRef(false);
  // True from an edit until its save starts.
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rev, setRev] = useState(0);
  // Each save takes a number. Only the newest save may change what the screen says.
  const seq = useRef(0);
  // Saves run one after another so two writes never overlap.
  const chain = useRef<Promise<void>>(Promise.resolve());
  // Changes whenever the open CV changes, so a late result for the old one is ignored.
  const generation = useRef(0);

  const commit = useCallback((next: History<Cv> | null) => {
    historyRef.current = next;
    latest.current = next ? next.present : null;
    setHistory(next);
  }, []);

  const persist = useCallback((): Promise<void> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const current = latest.current;
    if (!current || blocked.current || !dirty.current) return chain.current;
    const now = new Date();
    const stamped: Cv = {
      ...current,
      style: clampStyle(current.style),
      updatedAt: now.toISOString(),
    };
    dirty.current = false;
    const mine = ++seq.current;
    const gen = generation.current;
    const run = chain.current.then(async () => {
      let result: Awaited<ReturnType<typeof saveCv>>;
      try {
        if (sandbox) {
          result = writeSandboxDraft(stamped)
            ? { ok: true, value: null }
            : { ok: false, reason: "unavailable" };
        } else {
          result = await saveCv(stamped);
        }
      } catch {
        result = { ok: false, reason: "unavailable" };
      }
      if (gen !== generation.current) return;
      if (result.ok) {
        if (mine === seq.current && !dirty.current) setSaveState("saved");
        if (!sandbox) void maybeSnapshot(stamped, now);
        return;
      }
      if (mine !== seq.current) return;
      dirty.current = true;
      setSaveState(result.reason === "invalid" ? "invalid" : "unavailable");
    });
    chain.current = run;
    return run;
  }, [sandbox]);

  useEffect(() => {
    let cancelled = false;
    generation.current += 1;
    blocked.current = false;
    dirty.current = false;
    historyRef.current = null;
    latest.current = null;
    const previous = chain.current;
    void previous
      .then((): StorageResult<Cv> | Promise<StorageResult<Cv>> | null => {
        if (cancelled) return null;
        // The old CV leaves the screen at once, so no edit can reach it under the new id.
        commit(null);
        setSaveState("empty");
        if (sandbox) {
          const draft = readSandboxDraft();
          return draft
            ? { ok: true as const, value: draft }
            : { ok: false as const, reason: "missing" as const };
        }
        return readItem("cvs", cvId, storedCvSchema);
      })
      .then((result) => {
        if (cancelled || !result) return;
        if (result.ok) {
          commit(startHistory(prepareLoaded(result.value, country)));
          setSaveState("loaded");
          return;
        }
        commit(startHistory(newCv(cvId, country, new Date().toISOString())));
        if (result.reason === "invalid") {
          blocked.current = true;
          setSaveState("unreadable");
        } else if (result.reason === "unavailable") setSaveState("unavailable");
        else setSaveState("empty");
      });
    return () => {
      cancelled = true;
      // Write the old CV's last edit before anything is reset for the next one.
      void persist();
    };
  }, [country, cvId, commit, persist, sandbox]);

  const touched = useCallback(() => {
    dirty.current = true;
    setSaveState((s) => (s === "unavailable" || s === "unreadable" ? s : "saving"));
    setRev((n) => n + 1);
  }, []);

  const step = useCallback(
    (make: (h: History<Cv>) => History<Cv>) => {
      const h = historyRef.current;
      if (!h) return;
      const next = make(h);
      if (next === h) return;
      commit(next);
      touched();
    },
    [commit, touched],
  );

  const edit = useCallback(
    (change: (draft: Cv) => Cv) => step((h) => recordEdit(h, change(h.present), Date.now())),
    [step],
  );
  const undo = useCallback(() => step(undoHistory), [step]);
  const redo = useCallback(() => step(redoHistory), [step]);

  useEffect(() => {
    if (rev === 0 || blocked.current) return;
    timer.current = setTimeout(() => void persist(), AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [rev, persist]);

  // Closing or hiding the tab inside the pause: write the last edit now.
  useEffect(() => {
    const flush = () => void persist();
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [persist]);

  // Ctrl or Cmd with S, Z and Shift Z only. No single key shortcuts.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      // Inside a field the browser's own undo handles the text.
      const target = event.target;
      const inField =
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (key === "z" && inField) return;
      if (key === "s" && !event.shiftKey) {
        event.preventDefault();
        void persist();
      } else if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist, undo, redo]);

  const restartWith = useCallback(
    (cv: Cv) => {
      step((h) => recordEdit(h, cv, Date.now(), true));
    },
    [step],
  );

  const startNew = useCallback(() => {
    blocked.current = false;
    setSaveState("empty");
  }, []);

  return {
    cv: history?.present ?? null,
    saveState,
    edit,
    undo,
    redo,
    canUndo: history ? canUndo(history) : false,
    canRedo: history ? canRedo(history) : false,
    saveNow: persist,
    replaceWith: restartWith,
    startNew,
  };
}
