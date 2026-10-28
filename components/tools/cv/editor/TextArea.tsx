import type { ComponentProps } from "react";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/Field";

type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextArea({ label, hint, error, className, ...props }: TextAreaProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <textarea
          {...props}
          id={control.id}
          aria-invalid={control["aria-invalid"]}
          aria-describedby={control["aria-describedby"]}
          className={cn(
            "min-h-24 w-full min-w-0 rounded-input border bg-surface-2 px-3 py-2 text-base text-text",
            "transition-colors duration-150 ease-[var(--ease-out)]",
            error ? "border-danger" : "border-border-strong",
            className,
          )}
        />
      )}
    </Field>
  );
}
