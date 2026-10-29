import Link from "next/link";
import { Calculator, FileText, LayoutGrid, Scale, Target, type LucideIcon } from "lucide-react";
import { StatusPill, type Status } from "@/components/shell/StatusPill";

const LINK =
  "inline-flex min-h-11 items-center text-base font-semibold text-primary underline-offset-4 hover:underline";

type Tile = {
  href: string;
  title: string;
  description: string;
  status: Status;
  Icon: LucideIcon;
};

const TILES: Tile[] = [
  {
    href: "/uk/salary-calculator",
    title: "Take-home pay",
    description: "See what reaches your bank after tax and pension.",
    status: "coming-soon",
    Icon: Calculator,
  },
  {
    href: "/uk/cv",
    title: "CV builder",
    description: "Write each section and watch the page update.",
    status: "preview",
    Icon: FileText,
  },
  {
    href: "/uk/compare/offers",
    title: "Salary comparison",
    description: "Put two offers side by side after tax.",
    status: "coming-soon",
    Icon: Scale,
  },
  {
    href: "/uk/match",
    title: "Job matching",
    description: "Check a job ad against what your CV says.",
    status: "coming-soon",
    Icon: Target,
  },
  {
    href: "/uk",
    title: "More tools",
    description: "A job tracker and short career guides.",
    status: "beta",
    Icon: LayoutGrid,
  },
];

export function Suite() {
  return (
    <section
      id="tools"
      aria-labelledby="tools-heading"
      className="mx-auto max-w-[1120px] scroll-mt-[calc(var(--header-h)+1rem)] px-4 py-12 md:px-6 md:py-16"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full border border-border bg-surface px-3 py-0.5 text-sm font-semibold">
            The Stepkite suite
          </p>
          <h2
            id="tools-heading"
            className="mt-3 font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
          >
            Everything you need to apply for jobs.
          </h2>
          <p className="mt-3 text-lg text-muted">
            Each tool says what works today and what is still being built.
          </p>
        </div>
        <Link href="/uk" className={LINK}>
          Explore all tools
        </Link>
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TILES.map(({ href, title, description, status, Icon }) => (
          <li key={title} className="min-w-0">
            <article className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-input bg-accent-soft">
                <Icon aria-hidden="true" size={20} />
              </span>
              <h3 className="text-base font-semibold [overflow-wrap:anywhere]">{title}</h3>
              <StatusPill status={status} className="self-start" />
              <p className="text-sm text-muted">{description}</p>
              <Link href={href} className={`${LINK} mt-auto text-sm`}>
                Open {title}
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
