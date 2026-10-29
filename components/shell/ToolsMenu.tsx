"use client";

import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";

export type ToolLink = { href: string; label: string };

type Props = {
  links: ToolLink[];
  pathname: string;
  active: boolean;
  /** "popover" floats under the button. "inline" opens in the flow, for the mobile menu. */
  layout: "popover" | "inline";
  onNavigate?: () => void;
  className: string;
};

/** A disclosure button with a list of links. Escape closes it and returns focus to the button. */
export function ToolsMenu({ links, pathname, active, layout, onNavigate, className }: Props) {
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const open = openedPath === pathname;
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedPath(null);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (layout === "popover" && !rootRef.current?.contains(event.target as Node)) {
        setOpenedPath(null);
      }
    };
    const onFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (layout === "popover" && next && !rootRef.current?.contains(next)) setOpenedPath(null);
    };
    const root = rootRef.current;
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open, layout]);

  return (
    <div ref={rootRef} className={cn(layout === "popover" ? "relative" : "w-full")}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpenedPath(open ? null : pathname)}
        className={cn(
          className,
          "gap-1",
          layout === "inline" && "w-full justify-between",
          active
            ? "bg-accent-soft font-semibold text-text"
            : "text-muted hover:bg-surface-2 hover:text-text",
        )}
      >
        Tools
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={cn(
            "shrink-0 transition-transform duration-150 ease-[var(--ease-out)]",
            open && "rotate-180",
          )}
        />
      </button>
      <ul
        id={id}
        hidden={!open}
        className={cn(
          layout === "popover"
            ? "absolute left-0 top-full z-40 mt-1 w-64 min-w-56 rounded-card border border-border bg-surface p-1 shadow-pop"
            : "mt-1 flex flex-col gap-1 pl-3",
        )}
      >
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              onClick={() => {
                setOpenedPath(null);
                onNavigate?.();
              }}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 rounded-input px-3 text-base text-text",
                "transition-colors duration-150 ease-[var(--ease-out)] hover:bg-surface-2 active:bg-accent-soft",
                pathname === link.href && "bg-accent-soft font-semibold",
              )}
            >
              {link.label}
              {pathname === link.href ? (
                <Check aria-hidden="true" size={18} className="shrink-0 text-primary" />
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
