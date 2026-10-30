/** In memory undo and redo. The caller owns the clock, so tests need no timers. */
export const HISTORY_LIMIT = 50;
/** Edits closer together than this share one undo step, so typing a word is one step. */
export const COALESCE_MS = 1000;

export type History<T> = {
  past: readonly T[];
  present: T;
  future: readonly T[];
  /** Time of the last recorded edit, or 0 when none. */
  lastAt: number;
};

export function startHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastAt: 0 };
}

/** `forceStep` makes the change its own undo step, for imports and restores. */
export function recordEdit<T>(h: History<T>, next: T, now: number, forceStep = false): History<T> {
  if (Object.is(next, h.present)) return h;
  const merge =
    !forceStep && h.past.length > 0 && h.future.length === 0 && now - h.lastAt < COALESCE_MS;
  const past = merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], lastAt: now };
}

export function undo<T>(h: History<T>): History<T> {
  const previous = h.past[h.past.length - 1];
  if (previous === undefined) return h;
  return {
    past: h.past.slice(0, -1),
    present: previous,
    future: [h.present, ...h.future].slice(0, HISTORY_LIMIT),
    lastAt: 0,
  };
}

export function redo<T>(h: History<T>): History<T> {
  const [next, ...rest] = h.future;
  if (next === undefined) return h;
  return {
    past: [...h.past, h.present].slice(-HISTORY_LIMIT),
    present: next,
    future: rest,
    lastAt: 0,
  };
}

export const canUndo = (h: History<unknown>): boolean => h.past.length > 0;
export const canRedo = (h: History<unknown>): boolean => h.future.length > 0;
