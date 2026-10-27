import type { HTMLAttributes } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "highlight";

const tones: Record<Tone, string> = {
  neutral: "bg-accent-soft text-text",
  highlight: "bg-highlight text-ink",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: Tone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-0.5 text-sm font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
