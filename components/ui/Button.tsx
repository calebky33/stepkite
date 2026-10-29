import type { ComponentProps } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary:
    // The raised hover shadow sits on a pseudo-element that fades in, so only transform and opacity animate.
    "relative bg-primary text-primary-fg shadow-[inset_0_0_0_1px_rgb(0_0_0/0.22),0_1px_2px_rgb(17_24_39/0.12)] hover:-translate-y-px disabled:hover:translate-y-0 disabled:hover:after:opacity-0 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:opacity-0 after:shadow-[0_4px_10px_rgb(17_24_39/0.16)] after:transition-opacity after:duration-150 after:ease-[var(--ease-out)] hover:after:opacity-100",
  secondary: "border border-border-strong bg-surface text-text shadow-card hover:bg-surface-2",
  ghost: "text-primary hover:bg-surface-2",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  loading?: boolean;
};

/** Press feedback on :active, hover only where a real hover exists (Tailwind gates hover:). */
export function Button({
  variant = "primary",
  loading = false,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex min-h-11 max-w-full select-none items-center justify-center rounded-input px-4 py-2 text-center text-base font-semibold",
        "transition-[transform,scale,translate,background-color,opacity] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
        "disabled:opacity-50 disabled:active:scale-100",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
