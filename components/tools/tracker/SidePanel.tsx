"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { IconButton } from "@/components/ui/IconButton";

type DirtyEntry = { cancel: () => void };
type DirtyRegistry = Map<string, DirtyEntry>;

const PanelDirtyContext = createContext<{ current: DirtyRegistry } | null>(null);

/**
 * Register a dirty form inside SidePanel. While dirty is true, pressing Escape runs the
 * cancel callback and keeps the panel open. Clean forms do not register, so Escape closes
 * the panel as usual. Safe to call outside a panel: it does nothing then.
 */
export function usePanelDirty(dirty: boolean, cancel: () => void): void {
  const registry = useContext(PanelDirtyContext);
  const id = useId();
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => {
    if (!registry) return;
    const store = registry.current;
    if (dirty) {
      store.set(id, { cancel: () => cancelRef.current() });
      return () => {
        store.delete(id);
      };
    }
    store.delete(id);
    return undefined;
  }, [registry, id, dirty]);
}

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Where focus goes when the panel closes. Falls back to the page. */
  returnFocus: () => HTMLElement | null;
  /** The live region message echoed inside the dialog so announcements still reach AT. */
  announce?: string;
  children: ReactNode;
};

/**
 * A bottom sheet on phones and a side panel from 1024px. Radix traps focus inside,
 * closes on Escape and marks the page behind as inert.
 */
export function SidePanel({ title, subtitle, onClose, returnFocus, announce, children }: Props) {
  const dirty = useRef<DirtyRegistry>(new Map());
  const value = useMemo(() => dirty, []);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    const entries = Array.from(dirty.current.values());
    if (entries.length === 0) return;
    event.preventDefault();
    for (const e of entries) {
      try {
        e.cancel();
      } catch {
        // A failing cancel should not block Escape handling for the others.
      }
    }
  }, []);

  const handleCloseAutoFocus = useCallback(
    (event: Event) => {
      const target = returnFocus();
      if (target) {
        event.preventDefault();
        target.focus();
        return;
      }
      // The card is gone. Pick the Undo button if it is on screen, else the first tab.
      const undo = document.querySelector<HTMLElement>("[data-tracker-undo] button");
      if (undo) {
        event.preventDefault();
        undo.focus();
        return;
      }
      const tab = document.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (tab) {
        event.preventDefault();
        tab.focus();
      }
    },
    [returnFocus],
  );

  return (
    <RadixDialog.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="sk-anim sk-fade fixed inset-0 z-40 bg-overlay" />
        <RadixDialog.Content
          aria-describedby={undefined}
          onEscapeKeyDown={handleEscape}
          onCloseAutoFocus={handleCloseAutoFocus}
          className={[
            "sk-anim sk-sheet sk-sheet-side fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col",
            "rounded-t-card border border-b-0 border-border bg-surface text-text shadow-dialog",
            "lg:inset-y-0 lg:bottom-auto lg:left-auto lg:right-0 lg:mx-0 lg:h-dvh lg:max-h-none lg:max-w-xl lg:rounded-none lg:border-b lg:border-r-0",
          ].join(" ")}
        >
          <PanelDirtyContext.Provider value={value}>
            <div className="flex items-start justify-between gap-3 border-b border-border px-6 pb-4 pt-6">
              <div className="min-w-0">
                <RadixDialog.Title className="font-display text-xl tracking-tight [overflow-wrap:anywhere]">
                  {title}
                </RadixDialog.Title>
                {subtitle ? (
                  <p className="mt-1 text-base text-muted [overflow-wrap:anywhere]">{subtitle}</p>
                ) : null}
              </div>
              <RadixDialog.Close asChild>
                <IconButton label="Close" icon={<X size={20} />} className="-mr-2 -mt-2" />
              </RadixDialog.Close>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              {/* Radix aria-hides siblings of the open dialog, so this duplicate region makes
                  announcements reach AT while the panel is open. The shell's region stays for
                  changes made before anything opens the panel. */}
              <p role="status" aria-live="polite" className="sr-only">
                {announce ?? ""}
              </p>
              {children}
            </div>
          </PanelDirtyContext.Provider>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
