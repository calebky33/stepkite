import { cn } from "@/components/ui/cn";

export type Status = "available" | "beta" | "coming-soon" | "draft" | "preview";

const STATUS: Record<Status, { label: string; dot: string }> = {
  available: { label: "Available", dot: "bg-positive" },
  beta: { label: "Beta", dot: "bg-highlight" },
  "coming-soon": { label: "Coming soon", dot: "bg-border-strong" },
  draft: { label: "Draft", dot: "bg-tax" },
  preview: { label: "Preview", dot: "bg-brand" },
};

/** Text label plus a coloured dot, so status never relies on colour alone. */
export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const item = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 text-sm font-medium text-text",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", item.dot)} />
      {item.label}
    </span>
  );
}
