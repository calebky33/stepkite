"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "./cn";

type Tone = "neutral" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: Tone;
  /** Milliseconds. Default 5000. */
  duration?: number;
};

type ToastItem = ToastInput & { id: number };

type ToastApi = { toast: (input: ToastInput) => void };

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast needs a ToastProvider above it.");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [nextId, setNextId] = useState(1);

  const toast = useCallback(
    (input: ToastInput) => {
      setItems((prev) => [...prev.slice(-2), { ...input, id: nextId }]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <RadixToast.Provider swipeDirection="down" label="Notifications">
        {children}
        {items.map((item) => (
          <RadixToast.Root
            key={item.id}
            duration={item.duration ?? 5000}
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((i) => i.id !== item.id));
            }}
            className={cn(
              "sk-anim sk-toast flex items-start gap-3 rounded-card border bg-surface p-4 text-text shadow-pop",
              item.tone === "error" ? "border-danger" : "border-border",
            )}
          >
            <div className="min-w-0 flex-1">
              <RadixToast.Title className="text-base font-semibold [overflow-wrap:anywhere]">
                {item.title}
              </RadixToast.Title>
              {item.description ? (
                <RadixToast.Description className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                  {item.description}
                </RadixToast.Description>
              ) : null}
            </div>
            <RadixToast.Close
              aria-label="Dismiss"
              className="-m-2 inline-flex size-11 shrink-0 items-center justify-center rounded-input transition-colors duration-150 hover:bg-surface-2"
            >
              <X size={18} aria-hidden="true" />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport
          className={cn(
            "fixed inset-x-0 bottom-0 z-[60] m-0 flex list-none flex-col gap-2 p-4 outline-none",
            "pb-[max(1rem,env(safe-area-inset-bottom))] sm:left-auto sm:w-96",
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
