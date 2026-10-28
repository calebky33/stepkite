"use client";

import { cn } from "@/components/ui/cn";
import { mouseHover } from "./pointerHover";

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  /** Net pay is positive. Every deduction is tax. */
  tone: "positive" | "tax";
};

type DonutProps = {
  /** Null draws equal neutral arcs and the placeholder label. */
  slices: DonutSlice[] | null;
  activeKey: string | null;
  onActiveChange: (key: string | null) => void;
  /** Spoken name for the chart when it holds real slices. */
  label: string;
  /** Turns a share into words for screen readers, for example "12 percent". */
  describe?: (slice: DonutSlice, share: number) => string;
};

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.5;
const PLACEHOLDER_ARCS = 4;

const TONE_VAR: Record<DonutSlice["tone"], string> = {
  positive: "var(--positive)",
  tax: "var(--tax)",
};

type Arc = {
  key: string;
  dash: string;
  offset: number;
  color: string;
  name: string;
  share: number;
};

function arcsFor(slices: DonutSlice[]): Arc[] {
  const kept = slices.filter((s) => Number.isFinite(s.value) && s.value > 0);
  const total = kept.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return [];
  let cumulative = 0;
  return kept.map((s) => {
    const share = s.value / total;
    const full = share * CIRCUMFERENCE;
    const length = kept.length > 1 ? Math.max(full - GAP, 0.5) : full;
    const arc: Arc = {
      key: s.key,
      dash: `${length} ${CIRCUMFERENCE - length}`,
      offset: -cumulative,
      color: TONE_VAR[s.tone],
      name: s.label,
      share,
    };
    cumulative += full;
    return arc;
  });
}

function placeholderArcs(): Arc[] {
  const full = CIRCUMFERENCE / PLACEHOLDER_ARCS;
  const length = full - GAP * 2;
  return Array.from({ length: PLACEHOLDER_ARCS }, (_, i) => ({
    key: `placeholder-${i}`,
    dash: `${length} ${CIRCUMFERENCE - length}`,
    offset: -(i * full),
    color: "var(--border)",
    name: "",
    share: 0,
  }));
}

const defaultDescribe = (slice: DonutSlice, share: number) =>
  `${slice.label}, ${Math.round(share * 100)} percent`;

/** A hand-written SVG ring. The box is a fixed size so nothing moves when slices arrive. */
export function Donut({
  slices,
  activeKey,
  onActiveChange,
  label,
  describe = defaultDescribe,
}: DonutProps) {
  const placeholder = slices === null;
  const arcs = placeholder ? placeholderArcs() : arcsFor(slices);
  const byKey = new Map((slices ?? []).map((s) => [s.key, s]));

  return (
    <figure className="m-0 flex w-40 shrink-0 flex-col items-center gap-2">
      <svg
        viewBox="0 0 100 100"
        className="size-40"
        role={placeholder ? "img" : "group"}
        aria-label={placeholder ? "Placeholder chart, no figures yet" : label}
      >
        {arcs.map((arc) => {
          const slice = byKey.get(arc.key);
          const dim = activeKey !== null && activeKey !== arc.key;
          return (
            <circle
              key={arc.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={arc.color}
              strokeWidth="14"
              strokeDasharray={arc.dash}
              strokeDashoffset={arc.offset}
              transform="rotate(-90 50 50)"
              opacity={dim ? 0.35 : 1}
              className={cn(
                "transition-opacity duration-150 ease-[var(--ease-out)]",
                !placeholder &&
                  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              )}
              {...(!placeholder && slice
                ? {
                    role: "img",
                    tabIndex: 0,
                    "aria-label": describe(slice, arc.share),
                    ...mouseHover(
                      () => onActiveChange(arc.key),
                      () => onActiveChange(null),
                    ),
                    onFocus: () => onActiveChange(arc.key),
                    onBlur: () => onActiveChange(null),
                  }
                : {})}
            />
          );
        })}
      </svg>
      <figcaption className="min-h-5 text-center text-sm text-muted">
        {placeholder ? "Placeholder, no figures yet" : null}
      </figcaption>
    </figure>
  );
}
