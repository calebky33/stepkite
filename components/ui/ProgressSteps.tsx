import type { ComponentProps } from "react";
import { cn } from "./cn";

type ProgressStepsProps = Omit<ComponentProps<"ol">, "children"> & {
  /** Names the list, for example Build your CV. */
  label: string;
  steps: string[];
  /** Zero based index of the step the user is on. */
  current: number;
};

export function ProgressSteps({ label, steps, current, className, ...props }: ProgressStepsProps) {
  return (
    <ol
      aria-label={label}
      className={cn("flex w-full min-w-0 items-start gap-2", className)}
      {...props}
    >
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={`${index}-${step}`}
            aria-current={active ? "step" : undefined}
            className={cn("flex min-w-0 flex-1 flex-col gap-2", !active && "max-sm:flex-none")}
          >
            <span
              aria-hidden="true"
              className={cn(
                "block h-1 rounded-full transition-colors duration-200 ease-[var(--ease-out)]",
                done || active ? "bg-primary" : "bg-surface-2",
              )}
            />
            <span
              className={cn(
                "text-sm [overflow-wrap:anywhere]",
                active ? "font-semibold text-text" : "text-muted",
                !active && "max-sm:sr-only",
              )}
            >
              <span className="tabular-nums">{index + 1}. </span>
              {step}
              {done ? <span className="sr-only"> (done)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
