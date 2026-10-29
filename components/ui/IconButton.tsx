import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-primary text-primary-fg hover:opacity-90",
  secondary: "border border-border bg-surface text-text hover:bg-surface-2",
  ghost: "text-text hover:bg-surface-2",
};

type IconButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  /** Accessible name. Icon buttons have no visible text. */
  label: string;
  icon: ReactNode;
  variant?: Variant;
  loading?: boolean;
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  loading = false,
  className,
  type = "button",
  disabled,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex size-11 shrink-0 select-none items-center justify-center rounded-input",
        "transition-[transform,scale,translate,background-color,opacity] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
        "disabled:opacity-50 disabled:active:scale-100",
        loading && "animate-pulse",
        styles[variant],
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="inline-flex size-5 items-center justify-center">
        {icon}
      </span>
    </button>
  );
}
