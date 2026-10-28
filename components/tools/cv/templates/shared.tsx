import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { Block } from "@/lib/cv/paginate";
import type { Cv } from "@/lib/cv/schema";
import { clampStyle, fontStack } from "@/lib/cv/style";

export type TemplateProps = { cv: Cv; blocks: readonly Block[]; locale: string };

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  Component: ComponentType<TemplateProps>;
};

export type Variant = {
  center: boolean;
  upperHeadings: boolean;
  headingRule: boolean;
  /** Scales text and gaps. Compact is below 1. */
  density: number;
  /** Title and dates share one line. */
  inlineDates: boolean;
};

export const VARIANTS = {
  plain: { center: false, upperHeadings: false, headingRule: true, density: 1, inlineDates: false },
  compact: {
    center: false,
    upperHeadings: true,
    headingRule: false,
    density: 0.92,
    inlineDates: true,
  },
  centred: {
    center: true,
    upperHeadings: false,
    headingRule: true,
    density: 1,
    inlineDates: false,
  },
} satisfies Record<string, Variant>;

/** Page text size in CSS pixels at 100 percent, about 10 point. */
const BASE_PX = 13.5;
const GAP_PX = { compact: 6, normal: 10, roomy: 16 } as const;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function formatMonth(value: string | null, locale: string): string {
  if (!value || !MONTH.test(value)) return "";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}

function range(start: string | null, end: string | null, locale: string, open: string): string {
  const from = formatMonth(start, locale);
  const to = formatMonth(end, locale);
  if (from && to) return `${from} to ${to}`;
  if (from) return `${from} to ${open}`;
  return to;
}

/**
 * One column of real text with standard headings. No tables, no images, no text in images.
 * Every block avoids breaking inside itself and wraps unbreakable strings.
 */
export function TemplateBody({
  cv,
  blocks,
  locale,
  variant,
}: TemplateProps & { variant: Variant }) {
  const style = clampStyle(cv.style);
  const gap = GAP_PX[style.spacing] * variant.density;
  const accent = style.accent;
  const align = variant.center ? "text-center" : "text-start";

  const heading = (text: string): ReactNode => (
    <h3
      className={`mb-1 font-bold ${variant.upperHeadings ? "uppercase tracking-wide" : ""} ${
        variant.headingRule ? "border-b border-ink/20 pb-0.5" : ""
      }`}
      style={{ color: accent, fontSize: variant.upperHeadings ? "0.9em" : "1.1em" }}
    >
      {text}
    </h3>
  );

  const titleRow = (title: string, dates: string): ReactNode =>
    variant.inlineDates ? (
      <p className="flex flex-wrap justify-between gap-x-4 font-semibold">
        <span dir="auto">{title}</span>
        {dates ? <span className="font-normal text-ink/70">{dates}</span> : null}
      </p>
    ) : (
      <>
        <p dir="auto" className="font-semibold">
          {title}
        </p>
        {dates ? <p className="text-ink/70">{dates}</p> : null}
      </>
    );

  const render = (block: Block): ReactNode => {
    if (block.kind === "header") {
      const bits = [cv.contact.email, cv.contact.phone, cv.contact.city].filter(Boolean);
      return (
        <header className={align}>
          {cv.contact.fullName ? (
            <h2
              dir="auto"
              className="font-extrabold"
              style={{ fontSize: "1.8em", lineHeight: 1.15 }}
            >
              {cv.contact.fullName}
            </h2>
          ) : null}
          {bits.length ? (
            <p
              dir="auto"
              className={`flex flex-wrap gap-x-4 text-ink/70 ${variant.center ? "justify-center" : ""}`}
            >
              {bits.map((bit, i) => (
                <span key={`${i}-${bit}`}>{bit}</span>
              ))}
            </p>
          ) : null}
        </header>
      );
    }
    if (block.kind === "summary") {
      return (
        <section aria-label="Summary">
          {block.heading ? heading("Summary") : null}
          <p dir="auto" className="whitespace-pre-wrap">
            {cv.summary}
          </p>
        </section>
      );
    }
    if (block.kind === "experience") {
      const job = cv.experience.find((x) => x.id === block.id);
      if (!job) return null;
      const title = [job.role, job.employer, job.location].filter(Boolean).join(", ");
      return (
        <section aria-label="Experience">
          {block.heading ? heading("Experience") : null}
          {titleRow(title || "Untitled job", range(job.start, job.end, locale, "present"))}
          <ul className="list-disc ps-5">
            {job.bullets
              .filter((b) => b.trim())
              .map((b, i) => (
                <li key={`${job.id}-${i}`} dir="auto">
                  {b}
                </li>
              ))}
          </ul>
        </section>
      );
    }
    if (block.kind === "impact") {
      return (
        <section aria-label="Quantified impact">
          {block.heading ? heading("Quantified impact") : null}
          <ul className="list-disc ps-5">
            {cv.impact
              .filter((line) => line.trim())
              .map((line, i) => (
                <li key={`impact-${i}`} dir="auto">
                  {line}
                </li>
              ))}
          </ul>
        </section>
      );
    }
    if (block.kind === "education") {
      const item = cv.education.find((x) => x.id === block.id);
      if (!item) return null;
      const title = [item.qualification, item.institution].filter(Boolean).join(", ");
      return (
        <section aria-label="Education">
          {block.heading ? heading("Education") : null}
          {titleRow(
            title || "Untitled qualification",
            range(item.start, item.end, locale, "present"),
          )}
          {item.details ? (
            <p dir="auto" className="whitespace-pre-wrap">
              {item.details}
            </p>
          ) : null}
        </section>
      );
    }
    const group = cv.skills.find((x) => x.id === block.id);
    if (!group) return null;
    return (
      <section aria-label="Skills">
        {block.heading ? heading("Skills") : null}
        <p dir="auto">
          {group.label ? <span className="font-semibold">{group.label}: </span> : null}
          {group.items.join(", ")}
        </p>
      </section>
    );
  };

  const root: CSSProperties = {
    fontFamily: fontStack(style.fontPair),
    fontSize: BASE_PX * style.fontScale * variant.density,
    lineHeight: 1.4,
  };

  return (
    <div className="min-w-0 text-ink [overflow-wrap:anywhere]" style={root}>
      {blocks.map((block) => (
        <div
          key={block.key}
          data-block={block.key}
          className="min-w-0 break-inside-avoid [overflow-wrap:anywhere]"
          style={{ paddingBottom: gap }}
        >
          {render(block)}
        </div>
      ))}
    </div>
  );
}
