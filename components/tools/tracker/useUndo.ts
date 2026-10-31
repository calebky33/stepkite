"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UNDO_WINDOW_MS } from "@/lib/tracker/deleteAll";

/** How long the Undo bar stays. */
export const UNDO_MS = UNDO_WINDOW_MS;

export type UndoEntry = {
  message: string;
  undo: () => void;
  /** Move keyboard focus to Undo, for changes that remove the control that had focus. */
  focusUndo?: boolean;
  /**
   * Runs when the 10 seconds pass without Undo, and ALSO when the entry is replaced by a
   * newer one or dismissed. So a cleanup tied to an entry (clearing a persisted snapshot,
   * for example) always runs when the entry leaves, not only when the timer runs out.
   */
  onExpire?: () => void;
};

/** One Undo slot with a 10 second timer. A newer change replaces the older entry. */
export function useUndo() {
  const [entry, setEntry] = useState<UndoEntry | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<UndoEntry | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const offer = useCallback(
    (next: UndoEntry, ms: number = UNDO_MS) => {
      stop();
      const previous = current.current;
      current.current = next;
      setEntry(next);
      // Replacing an entry runs its onExpire synchronously, so cleanups still fire.
      if (previous && previous !== next) previous.onExpire?.();
      timer.current = setTimeout(() => {
        if (current.current === next) current.current = null;
        setEntry(null);
        timer.current = null;
        next.onExpire?.();
      }, ms);
    },
    [stop],
  );

  const run = useCallback(() => {
    const now = current.current;
    if (!now) return;
    stop();
    current.current = null;
    setEntry(null);
    now.undo();
  }, [stop]);

  const dismiss = useCallback(() => {
    const previous = current.current;
    stop();
    current.current = null;
    setEntry(null);
    // Dismissing an entry runs its onExpire too, same reason as replacement.
    previous?.onExpire?.();
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { entry, offer, run, dismiss };
}
