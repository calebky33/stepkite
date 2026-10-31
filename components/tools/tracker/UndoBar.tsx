"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import type { UndoEntry } from "./useUndo";

type Props = { entry: UndoEntry | null; onUndo: () => void; inline?: boolean };

/**
 * The 10 second Undo bar. Fixed to the bottom of the screen, or inline inside a panel,
 * because an open panel makes everything outside it inert. The live region that announces
 * changes lives in the shell, so this bar is only the visible control.
 */
export function UndoBar({ entry, onUndo, inline = false }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  // Each entry's focus is taken once. A re-render with the same entry does not steal focus.
  const focused = useRef<UndoEntry | null>(null);
  useEffect(() => {
    if (entry && entry.focusUndo && focused.current !== entry) {
      focused.current = entry;
      bar.current?.querySelector("button")?.focus();
    }
    if (!entry) focused.current = null;
  }, [entry]);
  if (!entry) return null;
  return (
    <div
      ref={bar}
      className={cn(
        inline
          ? "sticky bottom-0 z-10"
          : "fixed inset-x-0 bottom-[var(--consent-h,0px)] z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-card border border-border bg-surface p-3 shadow-pop">
        <p className="min-w-0 text-base [overflow-wrap:anywhere]">{entry.message}</p>
        <Button variant="secondary" className="shrink-0" onClick={onUndo}>
          Undo
        </Button>
      </div>
    </div>
  );
}
