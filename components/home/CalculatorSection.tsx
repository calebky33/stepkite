import { StatusPill } from "@/components/shell/StatusPill";
import { HomeCalculator } from "@/components/tools/PayCalculator/HomeCalculator";

export function CalculatorSection() {
  return (
    <section
      id="calculator"
      aria-labelledby="calculator-heading"
      className="scroll-mt-[calc(var(--header-h)+1rem)] border-y border-border bg-surface-2"
    >
      <div className="mx-auto max-w-[1120px] px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2
              id="calculator-heading"
              className="font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
            >
              Start with your take-home pay
            </h2>
            <p className="mt-3 text-lg text-muted">
              Type a salary for the UK, the US or India. The calculator shows no figures until the
              rates are checked against the official source.
            </p>
          </div>
          <StatusPill status="coming-soon" />
        </div>
        <div className="mt-8">
          <HomeCalculator />
        </div>
      </div>
    </section>
  );
}
