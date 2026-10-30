"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * One footer link group. Below lg it is an accordion, collapsed on first paint.
 * From lg up the title is plain text and the links are always visible, so the
 * toggle button is removed from layout and from the accessibility tree.
 */
export function FooterGroup({
  title,
  label,
  children,
}: {
  title: string;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const titleId = `${id}-title`;
  const panelId = `${id}-panel`;

  return (
    <nav aria-label={label ?? title} className="border-b border-ink-line lg:border-b-0">
      <div className="relative flex min-h-11 items-center justify-between lg:min-h-0">
        <h2 id={titleId} className="text-sm font-semibold text-ink-fg">
          {title}
        </h2>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`size-4 shrink-0 text-ink-muted transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none lg:hidden ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-labelledby={titleId}
          onClick={() => setOpen((value) => !value)}
          className="absolute inset-0 rounded-input active:bg-ink-line/30 lg:hidden"
        />
      </div>
      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none lg:grid-rows-[1fr] ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div
          className={`min-h-0 overflow-hidden lg:visible lg:overflow-visible ${
            open ? "visible" : "invisible [transition:visibility_0s_linear_200ms]"
          }`}
        >
          {children}
        </div>
      </div>
    </nav>
  );
}
