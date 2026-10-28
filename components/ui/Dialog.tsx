"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { IconButton } from "./IconButton";

type DialogProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The element that opens the dialog. Optional when you control open. */
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  /** Buttons row at the bottom. */
  footer?: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {trigger ? <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger> : null}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="sk-anim sk-fade fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cn(
            "sk-anim sk-pop fixed inset-0 z-50 m-auto h-fit max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto",
            "rounded-card border border-border bg-surface p-6 text-text shadow-pop",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <RadixDialog.Title className="font-display text-xl font-extrabold [overflow-wrap:anywhere]">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton label="Close" icon={<X size={20} />} className="-mr-2 -mt-2" />
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="mt-2 text-base text-muted [overflow-wrap:anywhere]">
              {description}
            </RadixDialog.Description>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
