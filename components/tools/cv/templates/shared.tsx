import { useId, type ComponentType, type CSSProperties, type ReactNode } from "react";
import type { Block } from "@/lib/cv/paginate";
import type { Cv } from "@/lib/cv/schema";
import { bodyPx, clampStyle, fontStack, lineHeightFor } from "@/lib/cv/style";

export type TemplateProps = { cv: Cv; blocks: readonly Block[]; locale: string };

export type TemplateDef = {
  id: string;
  name: string;
  description: string;
  Component: ComponentType<TemplateProps>;
  /** True while the design is a stand in. Shown as a badge in the picker. */
  placeholder?: boolean;
};

export type Labels = {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  certifications: string;
  interests: string;
  references: string;
  impact: string;
  /** Joins two dates in a range: "Mar 2021 to Jun 2023". */
  to: string;
  /** Ends an open range: "Mar 2021 to present". */
  present: string;
};

/**
 * Every word a template prints that is not the person's own text lives in a Labels set.
 * English only for now. To translate, add a set here and pick it in labelsFor by content locale.
 */
const COMMON_LABELS = {
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
  impact: "Quantified impact",
  to: "to",
  present: "present",
} as const;

const DEFAULT_LABELS: Labels = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  ...COMMON_LABELS,
};

const UK_LABELS: Labels = {
  summary: "Personal statement",
  experience: "Work experience",
  education: "Education",
  skills: "Skills",
  ...COMMON_LABELS,
};

const IN_LABELS: Labels = {
  summary: "Career objective",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  ...COMMON_LABELS,
};

export type Variant = {
  center: boolean;
  upperHeadings: boolean;
  headingRule: boolean;
  /** Scales text and gaps. Compact is below 1. */
  density: number;
  /** Title and dates share one line. */
  inlineDates: boolean;
  /** Words and section headings. Without this the US set is used. */
  labels?: Labels;
  /** Name drawn in the accent colour. */
  accentName?: boolean;
  /** Accent bar at the start of each heading. */
  headingBar?: boolean;
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
  ukClassic: {
    center: false,
    upperHeadings: false,
    headingRule: true,
    density: 1,
    inlineDates: false,
    labels: UK_LABELS,
  },
  ukModern: {
    center: false,
    upperHeadings: true,
    headingRule: false,
    density: 1,
    inlineDates: true,
    labels: UK_LABELS,
    accentName: true,
    headingBar: true,
  },
  ukCompact: {
    center: false,
    upperHeadings: true,
    headingRule: true,
    density: 0.92,
    inlineDates: true,
    labels: UK_LABELS,
  },
  usClassic: {
    center: false,
    upperHeadings: false,
    headingRule: true,
    density: 1,
    inlineDates: false,
  },
  usModern: {
    center: false,
    upperHeadings: true,
    headingRule: false,
    density: 1,
    inlineDates: true,
    accentName: true,
    headingBar: true,
  },
  usCompact: {
    center: false,
    upperHeadings: true,
    headingRule: true,
    density: 0.92,
    inlineDates: true,
  },
  inClassic: {
    center: false,
    upperHeadings: false,
    headingRule: true,
    density: 1,
    inlineDates: false,
    labels: IN_LABELS,
  },
  inModern: {
    center: false,
    upperHeadings: true,
    headingRule: false,
    density: 1,
    inlineDates: true,
    labels: IN_LABELS,
    accentName: true,
    headingBar: true,
  },
  inCompact: {
    center: false,
    upperHeadings: true,
    headingRule: true,
    density: 0.92,
    inlineDates: true,
    labels: IN_LABELS,
  },
} satisfies Record<string, Variant>;

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

function range(start: string | null, end: string | null, locale: string, labels: Labels): string {
  const from = formatMonth(start, locale);
  const to = formatMonth(end, locale);
  if (from && to) return `${from} ${labels.to} ${to}`;
  if (from) return `${from} ${labels.to} ${labels.present}`;
  return to;
}

/** Translated sets by language code. Empty until a translation is written. */
const LABELS_BY_LANGUAGE: Readonly<Record<string, Labels>> = {};

/** Picks the label set: a translation for the content language, else the country set. */
function labelsFor(variant: Variant, locale: string): Labels {
  const language = locale.split("-")[0]?.toLowerCase() ?? "en";
  if (language !== "en" && Object.hasOwn(LABELS_BY_LANGUAGE, language)) {
    return LABELS_BY_LANGUAGE[language] ?? DEFAULT_LABELS;
  }
  return variant.labels ?? DEFAULT_LABELS;
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
  const labels = labelsFor(variant, locale);
  const uid = useId();
  const headId = (key: string) => `${uid}-${key}`;
  const align = variant.center ? "text-center" : "text-start";

  const heading = (text: string, key: string): ReactNode => (
    <h3
      id={headId(key)}
      className={`mb-1 font-bold [break-after:avoid] ${variant.upperHeadings ? "uppercase tracking-wide" : ""} ${
        variant.headingRule ? "border-b border-ink/20 pb-0.5" : ""
      } ${variant.headingBar ? "border-s-4 ps-2" : ""}`}
      style={{
        color: accent,
        borderColor: accent,
        fontSize: variant.upperHeadings ? "0.9em" : "1.1em",
      }}
    >
      {text}
    </h3>
  );

  const titleRow = (title: string, dates: string): ReactNode =>
    !title ? null : variant.inlineDates ? (
      <p className="flex flex-wrap justify-between gap-x-4 font-semibold">
        <span dir="auto">{title}</span>
        {dates ? <span className="font-normal text-ink/70 print:text-ink">{dates}</span> : null}
      </p>
    ) : (
      <>
        <p dir="auto" className="font-semibold">
          {title}
        </p>
        {dates ? <p className="text-ink/70 print:text-ink">{dates}</p> : null}
      </>
    );

  const render = (block: Block): ReactNode => {
    if (block.kind === "header") {
      const bits = [
        cv.contact.email,
        cv.contact.phone,
        cv.contact.city,
        ...cv.contact.links.map((l) => l.url || l.label),
      ].filter(Boolean);
      return (
        <header className={align}>
          {cv.contact.fullName ? (
            <h2
              dir="auto"
              className="font-extrabold"
              style={{
                fontSize: "1.8em",
                lineHeight: 1.15,
                color: variant.accentName ? accent : undefined,
              }}
            >
              {cv.contact.fullName}
            </h2>
          ) : null}
          {bits.length ? (
            <p
              dir="auto"
              className={`flex flex-wrap gap-x-2 text-ink/70 print:text-ink ${variant.center ? "justify-center" : ""}`}
            >
              {bits.map((bit, i) => (
                <span key={`${i}-${bit}`}>
                  {bit}
                  {i < bits.length - 1 ? <span aria-hidden="true"> |</span> : null}
                </span>
              ))}
            </p>
          ) : null}
        </header>
      );
    }
    if (block.kind === "summary") {
      return (
        <section aria-labelledby={block.heading ? headId("summary") : undefined}>
          {block.heading ? heading(labels.summary, "summary") : null}
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
        <section aria-labelledby={block.heading ? headId("experience") : undefined}>
          {block.heading ? heading(labels.experience, "experience") : null}
          {titleRow(title, range(job.start, job.end, locale, labels))}
          <ul className="list-disc ps-5">
            {job.bullets
              .filter((b) => b.trim())
              .map((b, i) => (
                <li key={`${job.id}-${i}`} dir="auto" className="[orphans:2] [widows:2]">
                  {b}
                </li>
              ))}
          </ul>
        </section>
      );
    }
    if (block.kind === "impact") {
      return (
        <section aria-labelledby={block.heading ? headId("impact") : undefined}>
          {block.heading ? heading(labels.impact, "impact") : null}
          <ul className="list-disc ps-5">
            {cv.impact
              .filter((line) => line.trim())
              .map((line, i) => (
                <li key={`impact-${i}`} dir="auto" className="[orphans:2] [widows:2]">
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
        <section aria-labelledby={block.heading ? headId("education") : undefined}>
          {block.heading ? heading(labels.education, "education") : null}
          {titleRow(title, range(item.start, item.end, locale, labels))}
          {item.details ? (
            <p dir="auto" className="whitespace-pre-wrap">
              {item.details}
            </p>
          ) : null}
        </section>
      );
    }
    if (block.kind === "certifications") {
      const item = cv.certifications.find((x) => x.id === block.id);
      if (!item) return null;
      const detail = [item.issuer, formatMonth(item.date, locale)].filter(Boolean).join(", ");
      return (
        <section aria-labelledby={block.heading ? headId("certifications") : undefined}>
          {block.heading ? heading(labels.certifications, "certifications") : null}
          <p dir="auto">
            <span className="font-semibold">{item.name}</span>
            {detail ? <span>{`, ${detail}`}</span> : null}
          </p>
        </section>
      );
    }
    if (block.kind === "interests") {
      return (
        <section aria-labelledby={block.heading ? headId("interests") : undefined}>
          {block.heading ? heading(labels.interests, "interests") : null}
          <p dir="auto" className="whitespace-pre-wrap">
            {cv.interests}
          </p>
        </section>
      );
    }
    if (block.kind === "references") {
      const item = cv.references.find((x) => x.id === block.id);
      if (!item) return null;
      const detail = [item.role, item.contact].filter(Boolean).join(", ");
      return (
        <section aria-labelledby={block.heading ? headId("references") : undefined}>
          {block.heading ? heading(labels.references, "references") : null}
          <p dir="auto">
            <span className="font-semibold">{item.name}</span>
            {detail ? <span>{`, ${detail}`}</span> : null}
          </p>
        </section>
      );
    }
    const group = cv.skills.find((x) => x.id === block.id);
    if (!group) return null;
    return (
      <section aria-labelledby={block.heading ? headId("skills") : undefined}>
        {block.heading ? heading(labels.skills, "skills") : null}
        <p dir="auto">
          {group.label ? <span className="font-semibold">{group.label}: </span> : null}
          {group.items.join(", ")}
        </p>
      </section>
    );
  };

  const root: CSSProperties = {
    fontFamily: fontStack(style.fontPair),
    fontSize: bodyPx(style.fontScale, variant.density),
    lineHeight: lineHeightFor(JSON.stringify(cv)),
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
