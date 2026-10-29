import { HomeCalculator } from "@/components/tools/PayCalculator/HomeCalculator";

export function CalculatorSection() {
  return (
    <section
      id="calculator"
      aria-labelledby="calculator-heading"
      className="scroll-mt-[calc(var(--header-h)+1rem)] border-y border-border bg-surface-2"
    >
      <div className="mx-auto max-w-[1120px] px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-2xl">
          <p className="inline-flex rounded-full border border-border bg-surface px-3 py-0.5 text-sm font-semibold">
            Take-home calculator
          </p>
          <h2
            id="calculator-heading"
            className="mt-3 font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
          >
            Calculate your take-home pay
          </h2>
          <p className="mt-3 text-lg text-muted">
            Pick a country and type your salary. Figures appear once the rates are checked against
            the official source.
          </p>
        </div>
        <div className="mt-8">
          <HomeCalculator />
        </div>
        <p className="mt-6 text-sm text-muted">
          Your numbers stay in this browser. Nothing you type is sent anywhere.
        </p>
      </div>
    </section>
  );
}
