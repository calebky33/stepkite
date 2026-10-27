import { useId, type InputHTMLAttributes } from "react";
import { cn } from "./cn";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, ...props }: InputProps) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={note ? noteId : undefined}
        className={cn(
          "min-h-11 rounded-input border bg-surface-2 px-3 text-base",
          error ? "border-danger" : "border-border",
          className,
        )}
      />
      {note ? (
        <p
          id={noteId}
          role={error ? "alert" : undefined}
          className={cn("text-sm", error ? "text-danger" : "text-muted")}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
