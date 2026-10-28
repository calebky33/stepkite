"use client";

import { useEffect, useRef, useState } from "react";

/** Eases a displayed figure to its new value in 200ms. Jumps straight there under reduced motion. */
export function useCountTween(target: number, duration = 200): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === target) {
      from.current = target;
      const jump = requestAnimationFrame(() => setShown(target));
      return () => cancelAnimationFrame(jump);
    }
    let frame = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const value = start + (target - start) * eased;
      from.current = value;
      setShown(value);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return shown;
}
