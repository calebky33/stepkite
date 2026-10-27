import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "highlight";

const tones: Record<Tone, string> = {
  neutral: "bg-accent-soft text-text",
  highlight: "bg-highlight text-ink",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

/** One line, never wraps. Long text is cut with an ellipsis and the full text stays in the title. */
export function Badge({ tone = "neutral", className, children, title, ...props }: BadgeProps) {
  return (
    <span
      title={title ?? (typeof children === "string" ? children : undefined)}
      className={cn(
        "inline-block max-w-full truncate whitespace-nowrap rounded-full px-3 py-0.5 align-middle text-sm font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
