"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "./cn";
import { Field } from "./Field";

export type SegmentOption<T extends string> = { value: T; label: string; disabled?: boolean };

type SegmentedControlProps<T extends string> = {
  label: string;
  hint?: string;
  error?: string;
  options: SegmentOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  disabled?: boolean;
  className?: string;
};

/** Radio group styled as a pill. Arrow keys move and select, Tab leaves the group. */
export function SegmentedControl<T extends string>({
  label,
  hint,
  error,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  const [inner, setInner] = useState<T | undefined>(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const choose = (next: T) => {
    if (value === undefined) setInner(next);
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const step = forward ? 1 : -1;
    for (let i = 1; i <= options.length; i += 1) {
      const nextIndex = (index + step * i + options.length * i) % options.length;
      const option = options[nextIndex];
      if (option && !option.disabled) {
        refs.current[nextIndex]?.focus();
        choose(option.value);
        return;
      }
    }
  };

  return (
    <Field label={label} hint={hint} error={error} labelAs="span" className={className}>
      {(control) => (
        <div
          role="radiogroup"
          aria-labelledby={control.labelId}
          aria-describedby={control["aria-describedby"]}
          aria-invalid={control["aria-invalid"]}
          className="flex w-full min-w-0 rounded-input bg-surface-2 p-1"
        >
          {options.map((option, index) => {
            const checked = option.value === current;
            return (
              <button
                key={option.value}
                ref={(node) => {
                  refs.current[index] = node;
                }}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked || (current === undefined && index === 0) ? 0 : -1}
                disabled={disabled || option.disabled}
                onClick={() => choose(option.value)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={cn(
                  "min-h-11 min-w-11 flex-1 select-none rounded-[6px] px-3 text-base [overflow-wrap:anywhere]",
                  "transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                  "disabled:opacity-50 disabled:active:scale-100",
                  checked
                    ? "border border-border bg-surface font-semibold text-text shadow-card"
                    : "border border-transparent text-muted hover:text-text",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}
