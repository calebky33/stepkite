"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactElement, ReactNode } from "react";
import { cn } from "./cn";

type TooltipProps = {
  /** Short text. Do not put anything essential here, touch users never see it. */
  content: ReactNode;
  /** One focusable element. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              "sk-anim sk-pop z-50 max-w-64 rounded-input bg-text px-3 py-1.5 text-sm text-bg [overflow-wrap:anywhere]",
              "origin-[var(--radix-tooltip-content-transform-origin)]",
              className,
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
