"use client";

import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/Button";
import { cvFileName, printPageStyle } from "@/lib/cv/print";
import type { CvRules } from "@/lib/cv/rules/types";
import { saveDownloadAnswer } from "@/lib/storage/cvFeedback";

type State = "idle" | "working" | "failed" | "asking" | "answered" | "answerFailed";

/**
 * Prints the same pages the preview shows. The browser's print dialog saves them as a PDF with
 * real, selectable text. Nothing is uploaded: the pages are cloned into a local print frame.
 */
export function PdfDownload({
  contentRef,
  cvId,
  title,
  fullName,
  rules,
  disabledReason,
  onPrintingChange,
}: {
  contentRef: RefObject<HTMLDivElement | null>;
  cvId: string;
  title: string;
  fullName: string;
  rules: CvRules;
  /** When set, the button is off and this says why. */
  disabledReason: string | null;
  /** True while the print copy of the pages must exist in the page. */
  onPrintingChange?: (printing: boolean) => void;
}) {
  const [state, setState] = useState<State>("idle");
  const doc = rules.documentName;
  const noteId = useId();
  const button = useRef<HTMLButtonElement>(null);
  const previous = useRef<State>("idle");
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopWaiting = useCallback(() => {
    if (giveUp.current) clearTimeout(giveUp.current);
    giveUp.current = null;
    onPrintingChange?.(false);
  }, [onPrintingChange]);

  useEffect(
    () => () => {
      if (giveUp.current) clearTimeout(giveUp.current);
    },
    [],
  );

  // After an answer, Dismiss or Try again the control that had focus is gone. Put focus back.
  useEffect(() => {
    const open = (s: State) => s === "asking" || s === "answerFailed" || s === "failed";
    if (open(previous.current) && !open(state)) button.current?.focus();
    previous.current = state;
  }, [state]);

  const print = useReactToPrint({
    contentRef,
    documentTitle: cvFileName(title, fullName, doc, new Date()),
    pageStyle: printPageStyle(rules.paper),
    onBeforePrint: async () => {
      onPrintingChange?.(true);
      // Two frames, so the print pages are in the page before they are cloned.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    },
    onAfterPrint: () => {
      stopWaiting();
      setState("asking");
    },
    onPrintError: () => {
      stopWaiting();
      setState("failed");
    },
  });

  const start = useCallback(() => {
    if (disabledReason !== null || state === "working") return;
    setState("working");
    // If the browser never reports the print as done, stop waiting after a minute.
    giveUp.current = setTimeout(() => {
      onPrintingChange?.(false);
      setState((s) => (s === "working" ? "idle" : s));
    }, 60_000);
    try {
      void Promise.resolve(print()).catch(() => {
        stopWaiting();
        setState("failed");
      });
    } catch {
      stopWaiting();
      setState("failed");
    }
  }, [disabledReason, state, print, onPrintingChange, stopWaiting]);

  const answer = async (value: "yes" | "no") => {
    const result = await saveDownloadAnswer(cvId, value, new Date());
    setState(result.ok ? "answered" : "answerFailed");
  };

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Button
        ref={button}
        onClick={start}
        aria-disabled={disabledReason !== null || state === "working"}
        aria-describedby={noteId}
        className={disabledReason !== null || state === "working" ? "opacity-50" : undefined}
      >
        {state === "working" ? "Preparing the PDF" : "Download PDF"}
      </Button>
      <p id={noteId} className="text-sm text-muted">
        {disabledReason ?? `Choose Save as PDF in the window that opens.`}
      </p>
      <div aria-live="polite" className="flex flex-col gap-2 sm:items-end">
        {state === "failed" ? (
          <div className="flex flex-col gap-2 sm:items-end">
            <p className="text-sm text-danger">
              The download did not start. Your browser may have blocked the print window. Allow pop
              ups for this site, then try again.
            </p>
            <Button variant="secondary" onClick={start}>
              Try again
            </Button>
          </div>
        ) : null}
        {state === "asking" || state === "answerFailed" ? (
          <div
            role="group"
            aria-label="Download feedback"
            className="flex flex-col gap-2 rounded-input border border-border p-3 sm:items-end"
          >
            <p className="text-sm font-medium">Did this work for your application?</p>
            {state === "answerFailed" ? (
              <p className="text-sm text-danger">
                We could not save your answer on this device. You can close this.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => void answer("yes")}>
                Yes
              </Button>
              <Button variant="secondary" onClick={() => void answer("no")}>
                No
              </Button>
              <Button variant="ghost" onClick={() => setState("idle")}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}
        {state === "answered" ? (
          <p className="text-sm text-muted">Thanks. Your answer is saved on this device only.</p>
        ) : null}
      </div>
    </div>
  );
}
