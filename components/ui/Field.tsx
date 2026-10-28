import { useId, type ReactNode } from "react";
import { cn } from "./cn";

export type FieldControlProps = {
  id: string;
  labelId: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  /** Use "span" when the control is not a native labelable element. */
  labelAs?: "label" | "span";
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
};

/** Shared label, hint and error wiring. The error replaces the hint and is announced. */
export function Field({ label, hint, error, labelAs = "label", className, children }: FieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const noteId = `${id}-note`;
  const note = error ?? hint;
  const labelClass = "text-sm font-semibold [overflow-wrap:anywhere]";
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      {labelAs === "label" ? (
        <label id={labelId} htmlFor={id} className={labelClass}>
          {label}
        </label>
      ) : (
        <span id={labelId} className={labelClass}>
          {label}
        </span>
      )}
      {children({
        id,
        labelId,
        "aria-describedby": note ? noteId : undefined,
        "aria-invalid": error ? true : undefined,
      })}
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
