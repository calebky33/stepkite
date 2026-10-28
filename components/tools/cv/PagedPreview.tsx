"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_INFO, type CountryCode } from "@/lib/countries";
import { exampleCv } from "@/lib/cv/example";
import { buildBlocks, estimateHeight, paginate } from "@/lib/cv/paginate";
import type { Cv } from "@/lib/cv/schema";
import { cn } from "@/components/ui/cn";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { clampStyle } from "@/lib/cv/style";
import { resolveTemplate } from "./templates";

/** Paper sizes in millimetres. */
export const PAPER_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
} as const;

const PX_PER_MM = 96 / 25.4;

export type Zoom = "fit" | "full";

/** Fit width shrinks the page to the column. Full shows it at true size and the column scrolls sideways. */
export function scaleFor(zoom: Zoom, fit: number): number {
  return zoom === "full" ? 1 : fit;
}

function sameHeights(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = Object.keys(b);
  return keys.length === Object.keys(a).length && keys.every((k) => a[k] === b[k]);
}

/**
 * Page boxes at true paper size, scaled down with a transform to fit the column.
 * Blocks are measured in a hidden copy at the real content width, then placed on pages so no
 * entry is cut in two. Until a block is measured (first paint, tests) a height estimate is used.
 */
export function PagedPreview({ cv: userCv, country }: { cv: Cv; country: CountryCode }) {
  const isEmpty = useMemo(() => buildBlocks(userCv).length === 0, [userCv]);
  const cv = useMemo(() => (isEmpty ? exampleCv(userCv) : userCv), [isEmpty, userCv]);
  const info = COUNTRY_INFO[country];
  const paper = PAPER_MM[info.paper];
  const style = clampStyle(cv.style);
  const pageW = paper.width * PX_PER_MM;
  const pageH = paper.height * PX_PER_MM;
  const margin = style.marginMm * PX_PER_MM;
  const contentW = pageW - 2 * margin;
  const contentH = pageH - 2 * margin;

  const template = resolveTemplate(country, cv.templateId);
  const Template = template.Component;
  const blocks = useMemo(() => buildBlocks(cv), [cv]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(0.5);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const scale = scaleFor(zoom, fit);
  const [measured, setMeasured] = useState<Record<string, number>>({});

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setFit(Math.min(1, width / pageW));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageW]);

  // Heights change with the content, the template and the column width. A hidden preview
  // measures zero, so the scale change when it becomes visible measures it again.
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const next: Record<string, number> = {};
    root.querySelectorAll<HTMLElement>("[data-block]").forEach((el) => {
      if (el.offsetHeight > 0) next[el.dataset.block ?? ""] = el.offsetHeight;
    });
    setMeasured((prev) => (sameHeights(prev, next) ? prev : next));
  }, [cv, Template, contentW, scale]);

  const pages = paginate(blocks, (b) => measured[b.key] ?? estimateHeight(cv, b), contentH);
  const total = pages.length;

  return (
    <div className="relative flex min-w-0 flex-col gap-3 rounded-card bg-surface-2 p-3 sm:p-4">
      <p className="min-h-6 text-sm text-muted">
        {isEmpty
          ? `Example. Your own words replace this as you type.`
          : `${total === 1 ? "1 page" : `${total} pages`}, ${info.paper} size.`}
      </p>
      <SegmentedControl<Zoom>
        label="Zoom"
        value={zoom}
        onValueChange={setZoom}
        className="max-w-xs"
        options={[
          { value: "fit", label: "Fit width" },
          { value: "full", label: "100 percent" },
        ]}
      />
      <div
        role="region"
        aria-label={`${info.cvName} preview`}
        tabIndex={zoom === "full" ? 0 : undefined}
        ref={wrapRef}
        className={cn(
          "min-w-0 rounded-input",
          zoom === "full" && "overflow-x-auto overscroll-x-contain pb-2",
        )}
      >
        <div className="flex flex-col gap-4" style={zoom === "full" ? { width: pageW } : undefined}>
          {pages.map((page, index) => {
            const naturalH = Math.max(pageH, page.usedPx + 2 * margin);
            return (
              <div
                key={index}
                role="group"
                aria-label={`Page ${index + 1} of ${total}`}
                data-paper={info.paper}
                data-width-mm={paper.width}
                data-height-mm={paper.height}
                className="relative w-full overflow-hidden rounded-input border border-border bg-white shadow-pop"
                style={{ height: naturalH * scale }}
              >
                <div
                  className="relative bg-white"
                  style={{
                    width: pageW,
                    height: naturalH,
                    padding: margin,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <Template cv={cv} blocks={page.blocks} locale={info.locale} />
                  <p
                    aria-hidden="true"
                    className="absolute inset-x-0 text-center text-ink/60"
                    style={{ bottom: margin / 3, fontSize: 11 }}
                  >
                    Page {index + 1} of {total}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Hidden copy used only to measure block heights at the real content width. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        inert
        className="pointer-events-none invisible absolute left-0 top-0 h-0 overflow-hidden"
        style={{ width: contentW }}
      >
        <Template cv={cv} blocks={blocks} locale={info.locale} />
      </div>
    </div>
  );
}
