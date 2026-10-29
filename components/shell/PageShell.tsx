import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type PageShellProps = {
  title: string;
  lead?: string;
  /** Narrow keeps long text at a readable width. */
  narrow?: boolean;
  children?: ReactNode;
};

/** Page frame inside the layout's main element. Pages must not render their own main. */
export function PageShell({ title, lead, narrow = false, children }: PageShellProps) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-6 md:py-12">
      <div className={cn("flex flex-col gap-3 md:gap-4", narrow && "max-w-prose")}>
        <h1 className="font-display text-[28px] leading-tight tracking-tight md:text-4xl [overflow-wrap:anywhere]">
          {title}
        </h1>
        {lead ? <p className="text-lg text-muted">{lead}</p> : null}
      </div>
      <div className={cn("mt-8", narrow && "max-w-prose")}>{children}</div>
    </div>
  );
}
