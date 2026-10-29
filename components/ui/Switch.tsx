"use client";

import * as RadixSwitch from "@radix-ui/react-switch";
import { useId, type ComponentProps } from "react";
import { cn } from "./cn";

type SwitchProps = {
  label: string;
  hint?: string;
  error?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
  ref?: ComponentProps<"button">["ref"];
};

/** The whole row is the tap target. */
export function Switch({
  label,
  hint,
  error,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  name,
  className,
  ref,
}: SwitchProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <label
          htmlFor={id}
          className={cn(
            "min-w-0 py-2 text-base [overflow-wrap:anywhere]",
            disabled && "opacity-50",
          )}
        >
          {label}
        </label>
        <RadixSwitch.Root
          ref={ref}
          id={id}
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full border border-border-strong bg-surface-2",
            "transition-colors duration-150 ease-[var(--ease-out)]",
            "data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50",
            "after:absolute after:-inset-2",
          )}
        >
          <RadixSwitch.Thumb
            className={cn(
              "block size-5 translate-x-0.5 rounded-full bg-text shadow-card",
              "transition-transform duration-150 ease-[var(--ease-in-out)]",
              "data-[state=checked]:translate-x-6 data-[state=checked]:bg-primary-fg",
            )}
          />
        </RadixSwitch.Root>
      </div>
      {note ? (
        <p
          id={noteId}
          role={error ? "alert" : undefined}
          className={cn("text-sm [overflow-wrap:anywhere]", error ? "text-danger" : "text-muted")}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
