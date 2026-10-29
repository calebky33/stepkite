import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Field } from "./Field";

type InputProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, ...props }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <input
          {...props}
          id={control.id}
          aria-invalid={control["aria-invalid"]}
          aria-describedby={control["aria-describedby"]}
          className={cn(
            "min-h-11 w-full min-w-0 rounded-input border bg-surface-2 px-3 text-base text-text",
            "transition-colors duration-150 ease-[var(--ease-out)] disabled:opacity-50",
            "focus-visible:border-primary focus-visible:bg-surface",
            error ? "border-danger" : "border-border-strong",
            className,
          )}
        />
      )}
    </Field>
  );
}
