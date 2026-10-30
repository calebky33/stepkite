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
          <h2
            id="calculator-heading"
            className="font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]"
          >
            Calculate your take-home pay
          </h2>
          <p className="mt-3 text-lg text-muted">
            Type your salary and see what you keep. UK figures use the official 2026 to 27 rates.
            India is still being checked and the US is not built yet.
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
