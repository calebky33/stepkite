import { Calculator, FileText } from "lucide-react";
import { CountryLink } from "@/components/shell/CountryLink";
import { StatusPill, type Status } from "@/components/shell/StatusPill";

const LINK =
  "inline-flex min-h-11 items-center text-base font-semibold text-primary underline-offset-4 hover:underline";

type Extra = {
  href: string;
  title: string;
  description: string;
  status: Status;
  action: string;
};

const EXTRAS: Extra[] = [
  {
    href: "/compare/offers",
    title: "Salary comparison",
    description: "Put two offers side by side after tax.",
    status: "coming-soon",
    action: "Compare salaries",
  },
  {
    href: "/match",
    title: "Job matching",
    description: "Check a job ad against what your CV says.",
    status: "coming-soon",
    action: "Explore job matching",
  },
  {
    href: "",
    title: "More tools",
    description: "A job tracker and short career guides.",
    status: "coming-soon",
    action: "See more tools",
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
          Two tools work today. Three more are on the way.
        </h2>
        <p className="mt-3 text-lg text-muted">
          Each tool says what works now and what is still being built.
        </p>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-input bg-accent-soft">
                <Calculator aria-hidden="true" size={20} />
              </span>
              <StatusPill status="beta" />
            </div>
            <h3 className="font-display text-[22px] leading-tight">Take-home pay</h3>
            <p className="max-w-[34rem] text-base text-muted">
              See each deduction between your pay before tax and the money in your bank, including
              pension. The UK is ready. India is still being checked and the US is not built yet.
            </p>
            <CountryLink path="/salary-calculator" className={`${LINK} mt-2`}>
              Calculate my pay
            </CountryLink>
          </article>
          <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card md:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-input bg-accent-soft">
                <FileText aria-hidden="true" size={20} />
              </span>
              <StatusPill status="available" />
            </div>
            <h3 className="font-display text-[22px] leading-tight">CV builder</h3>
            <p className="max-w-[34rem] text-base text-muted">
              Write each section and watch the page update. Works for the UK, the US and India. Your
              work saves on this device.
            </p>
            <CountryLink path="/cv" className={`${LINK} mt-2`}>
              Build my CV
            </CountryLink>
          </article>
        </div>

        <ul className="divide-y divide-border rounded-card border border-border bg-surface-2">
          {EXTRAS.map(({ href, title, description, status, action }) => (
            <li key={title} className="flex flex-col gap-1 p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 text-base font-semibold [overflow-wrap:anywhere]">
                  {title}
                </h3>
                <StatusPill status={status} className="shrink-0" />
              </div>
              <p className="text-sm text-muted">{description}</p>
              <CountryLink path={href} className={`${LINK} text-sm`}>
                {action}
                <span className="sr-only">: {title}</span>
              </CountryLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
