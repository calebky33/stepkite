import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { CvPreview } from "./CvPreview";

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1120px] gap-12 px-4 py-12 md:px-6 md:py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted">
            <span aria-hidden="true" className="h-0.5 w-6 shrink-0 rounded-full bg-highlight" />
            Practical tools for better career and financial decisions.
          </p>
          <h1 className="mt-4 max-w-[20ch] font-display text-4xl leading-[1.06] tracking-tight md:text-5xl [overflow-wrap:anywhere]">
            Make your next career move with confidence.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Write your CV in the browser and see what you take home after tax once the pay
            calculator is ready. Built for the UK, the US and India.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/uk/cv" className={buttonStyles("primary")}>
              Build a CV
            </Link>
            <Link href="#tools" className={buttonStyles("secondary")}>
              See the tools
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Free to use. No account needed. Your CV and job list stay on your device.
          </p>
        </div>
        <div className="min-w-0">
          <CvPreview />
        </div>
      </div>
    </section>
  );
}
