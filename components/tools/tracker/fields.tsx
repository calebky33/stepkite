import type { ComponentProps } from "react";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/Field";

const CONTROL =
  "min-h-11 w-full min-w-0 rounded-input border bg-surface-2 px-3 text-base text-text transition-colors duration-150 ease-[var(--ease-out)] focus-visible:border-primary focus-visible:bg-surface disabled:opacity-50";

type SelectProps = Omit<ComponentProps<"select">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  options: readonly { value: string; label: string }[];
};

/** A native select. It keeps the phone's own picker and works with every keyboard. */
export function NativeSelect({
  label,
  hint,
  error,
  hideLabel,
  options,
  className,
  ...rest
}: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} hideLabel={hideLabel}>
      {(c) => (
        <select
          {...rest}
          id={c.id}
          aria-invalid={c["aria-invalid"]}
          aria-describedby={c["aria-describedby"]}
          className={cn(CONTROL, error ? "border-danger" : "border-border-strong", className)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

type AreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextArea({ label, hint, error, className, ...rest }: AreaProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(c) => (
        <textarea
          {...rest}
          id={c.id}
          aria-invalid={c["aria-invalid"]}
          aria-describedby={c["aria-describedby"]}
          className={cn(
            CONTROL,
            "min-h-24 py-2",
            error ? "border-danger" : "border-border-strong",
            className,
          )}
        />
      )}
    </Field>
  );
}
