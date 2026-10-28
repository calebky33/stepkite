"use client";

import * as RadixSlider from "@radix-ui/react-slider";
import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Field } from "./Field";

type SliderProps = {
  label: string;
  hint?: string;
  error?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  /** Fires when the user lets go, good for work that should not run on every step. */
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  /** Spoken value, for example 28,000 pounds. */
  valueText?: string;
  className?: string;
  ref?: ComponentProps<"span">["ref"];
};

export function Slider({
  label,
  hint,
  error,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  disabled,
  valueText,
  className,
  ref,
}: SliderProps) {
  const initial = value === undefined ? [defaultValue ?? min] : undefined;
  return (
    <Field label={label} hint={hint} error={error} labelAs="span" className={className}>
      {(control) => (
        <RadixSlider.Root
          ref={ref}
          value={value === undefined ? undefined : [value]}
          defaultValue={initial}
          onValueChange={(v) => {
            const next = v[0];
            if (next !== undefined) onValueChange?.(next);
          }}
          onValueCommit={(v) => {
            const next = v[0];
            if (next !== undefined) onValueCommit?.(next);
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="relative flex h-11 w-full touch-none select-none items-center data-[disabled]:opacity-50"
        >
          <RadixSlider.Track className="relative h-1.5 grow rounded-full bg-surface-2">
            <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
          </RadixSlider.Track>
          <RadixSlider.Thumb
            aria-labelledby={control.labelId}
            aria-describedby={control["aria-describedby"]}
            aria-invalid={control["aria-invalid"]}
            aria-valuetext={valueText}
            className={cn(
              "relative block size-6 rounded-full border-2 border-primary bg-surface",
              "after:absolute after:-inset-2.5",
              "transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
            )}
          />
        </RadixSlider.Root>
      )}
    </Field>
  );
}
