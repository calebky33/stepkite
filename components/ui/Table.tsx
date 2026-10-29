import type { ComponentProps } from "react";
import { cn } from "./cn";

type TableProps = ComponentProps<"table"> & {
  /** Names the table. Read by screen readers and used for the scroll region. */
  label: string;
};

/** Scrolls sideways on narrow screens instead of breaking the page. Figures use tabular numbers. */
export function Table({ label, className, children, ...props }: TableProps) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="w-full overflow-x-auto rounded-card border border-border bg-surface shadow-card"
    >
      <table className={cn("w-full border-collapse text-left text-base", className)} {...props}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<"thead">) {
  return <thead className={cn("bg-surface-2", className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn(className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return <tfoot className={cn("border-t border-border font-semibold", className)} {...props} />;
}

type RowProps = ComponentProps<"tr"> & { selected?: boolean };

export function TableRow({ selected = false, className, ...props }: RowProps) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        "border-b border-border last:border-b-0 data-[selected]:bg-accent-soft",
        "transition-colors duration-150 ease-[var(--ease-out)] hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

type CellProps = { numeric?: boolean };

export function TableHeaderCell({
  numeric = false,
  className,
  scope = "col",
  ...props
}: ComponentProps<"th"> & CellProps) {
  return (
    <th
      scope={scope}
      className={cn(
        "min-h-11 px-4 py-3 text-sm font-semibold text-muted",
        numeric ? "text-right tabular-nums" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  numeric = false,
  className,
  ...props
}: ComponentProps<"td"> & CellProps) {
  return (
    <td
      className={cn(
        "min-h-11 px-4 py-3 align-top [overflow-wrap:anywhere]",
        numeric && "whitespace-nowrap text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
