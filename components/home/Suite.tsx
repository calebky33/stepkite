import Link from "next/link";
import { StatusPill, type Status } from "@/components/shell/StatusPill";
import { CvPreview } from "./CvPreview";

const LINK =
  "inline-flex min-h-11 items-center text-base font-semibold text-primary underline underline-offset-4";

type Row = {
  href: string;
  title: string;
  description: string;
  status: Status;
};

const ROWS: Row[] = [
  {
    href: "/uk/tracker",
    title: "Job tracker",
    description:
      "Add a job, move it from saved to offer, and undo a delete. It stays on this device; sync is not connected yet.",
    status: "beta",
  },
  {
    href: "/uk/match",
    title: "Job ad matching",
    description:
      "Will compare the ad with your CV and show which requirements you already meet. It only uses what your CV says.",
    status: "coming-soon",
  },
  {
    href: "/uk/guides",
    title: "Career guides",
    description:
      "Short guides for the UK, US and India, marked as drafts until a person rewrites them.",
    status: "draft",
  },
  {
    href: "/uk/compare/offers",
    title: "Offer comparison",
    description: "Will compare two job offers after tax, side by side.",
    status: "coming-soon",
  },
];

export function Suite() {
  return (
    <section
      id="tools"
      aria-labelledby="tools-heading"
      className="mx-auto max-w-[1120px] scroll-mt-[calc(var(--header-h)+1rem)] px-4 py-12 md:px-6 md:py-16"
    >
      <div className="max-w-2xl">
        <h2
          id="tools-heading"
          className="font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
        >
          Everything you need for your next career move.
        </h2>
        <p className="mt-3 text-lg text-muted">
          Start with the CV builder, open the pay calculator, and keep track of every application.
          Each tool says what works today and what is still being built.
        </p>
        <p className="mt-2 text-sm text-muted">
          Tools open in the UK by default. Use the country links at the top of the page to switch.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <article className="grid gap-6 rounded-card border border-border bg-surface p-6 shadow-card md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-8 lg:col-span-7">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="beta" />
              <span className="text-sm text-muted">Templates for the UK, US and India</span>
            </div>
            <h3 className="mt-3 font-display text-[22px] leading-tight">CV builder</h3>
            <p className="mt-2 text-base text-muted">
              Write each section with a live page preview. Autosave keeps your work on this device.
              PDF download is not connected yet.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-muted">
              <li>Live page preview at A4 or Letter size</li>
              <li>Three placeholder layouts for each country</li>
              <li>Autosave on your device</li>
            </ul>
            <Link href="/uk/cv" className={`${LINK} mt-4`}>
              Open the CV builder
            </Link>
          </div>
          <CvPreview compact label="Example CV page in the CV builder card" />
        </article>

        <article className="flex flex-col rounded-card border border-border bg-surface-2 p-6 md:p-8 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status="coming-soon" />
            <span className="text-sm text-muted">Rates not checked yet</span>
          </div>
          <h3 className="mt-3 font-display text-[22px] leading-tight">Take-home pay calculator</h3>
          <p className="mt-2 text-base text-muted">
            It will show what you take home after tax, pension and other payroll deductions.
          </p>
          <ol className="mt-5 flex flex-col gap-4">
            <li className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold">
                1
              </span>
              <span>
                <span className="block font-semibold">Pay before tax</span>
                <span className="block text-sm text-muted">
                  The salary in the advert or your contract.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold">
                2
              </span>
              <span>
                <span className="block font-semibold">Deductions</span>
                <span className="block text-sm text-muted">
                  Tax, pension and other items, each named.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold">
                3
              </span>
              <span>
                <span className="block font-semibold">Take-home pay</span>
                <span className="block text-sm text-muted">The figure that reaches your bank.</span>
              </span>
            </li>
          </ol>
          <Link href="#calculator" className={`${LINK} mt-auto pt-5`}>
            See the calculator
          </Link>
        </article>

        <div className="rounded-card border border-border bg-surface p-6 shadow-card md:p-8 lg:col-span-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="font-display text-[22px] leading-tight">More career tools</h3>
            <Link href="/uk" className={LINK}>
              Open the country hub
            </Link>
          </div>
          <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {ROWS.map((row) => (
              <li
                key={row.href}
                className="border-t border-border first:border-t-0 sm:[&:nth-child(2)]:border-t-0"
              >
                <Link href={row.href} className="group flex flex-col gap-1 py-4">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-text group-hover:text-primary">
                    {row.title}
                    <StatusPill status={row.status} />
                  </span>
                  <span className="text-sm text-muted">{row.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col gap-4 rounded-card border border-border bg-accent-soft p-6 md:flex-row md:items-center md:justify-between lg:col-span-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold">Being built next</p>
            <p className="mt-1 text-base text-muted">
              PDF download is not connected yet. Job ad matching and offer comparison are not open
              yet. The pricing page marks each one as being built until it is ready.
            </p>
          </div>
          <Link href="/pricing" className={LINK}>
            See the pricing page
          </Link>
        </aside>
      </div>
    </section>
  );
}
