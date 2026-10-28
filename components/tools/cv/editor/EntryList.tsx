"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { moveItem, removeItem } from "@/lib/cv/list";

type Pending =
  | { kind: "move"; id: string; dir: "up" | "down" }
  | { kind: "add"; id: string }
  | { kind: "remove" };

type Props<T extends { id: string }> = {
  /** Singular, lower case: "job". Used in button names and announcements. */
  noun: string;
  items: readonly T[];
  max: number;
  onChange: (next: T[]) => void;
  makeItem: () => T;
  addLabel: string;
  emptyText: string;
  renderEntry: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : true;
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * A list of entries with add, remove, move up and move down. The buttons are the keyboard
 * alternative to dragging. Only mouse and touch moves animate; keyboard moves are instant.
 */
export function EntryList<T extends { id: string }>({
  noun,
  items,
  max,
  onChange,
  makeItem,
  addLabel,
  emptyText,
  renderEntry,
}: Props<T>) {
  const root = useRef<HTMLDivElement>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const pending = useRef<Pending | null>(null);
  const before = useRef<Map<string, number> | null>(null);
  const [note, setNote] = useState("");

  const entries = (): HTMLElement[] =>
    Array.from(root.current?.querySelectorAll<HTMLElement>("[data-entry]") ?? []);

  // Runs after each change, before paint. Handles focus, then the optional slide.
  useLayoutEffect(() => {
    const todo = pending.current;
    pending.current = null;
    const first = before.current;
    before.current = null;

    if (todo?.kind === "remove") addButton.current?.focus();
    if (todo?.kind === "add") {
      entries()
        .find((el) => el.dataset.entry === todo.id)
        ?.querySelector<HTMLElement>("input, textarea")
        ?.focus();
    }
    if (todo?.kind === "move") {
      const el = entries().find((e) => e.dataset.entry === todo.id);
      const wanted = el?.querySelector<HTMLButtonElement>(`[data-action="${todo.dir}"]`);
      const other = el?.querySelector<HTMLButtonElement>(
        `[data-action="${todo.dir === "up" ? "down" : "up"}"]`,
      );
      (wanted && !wanted.disabled ? wanted : other)?.focus();
    }

    if (!first) return;
    const moved = entries()
      .map((el) => ({
        el,
        dy: (first.get(el.dataset.entry ?? "") ?? 0) - el.getBoundingClientRect().top,
      }))
      .filter(({ dy }) => Math.abs(dy) > 1);
    if (moved.length === 0) return;
    // Start from the old position now, so there is no one frame jump.
    for (const { el, dy } of moved) el.style.transform = `translateY(${dy}px)`;
    const clear = () => {
      for (const { el } of moved) el.style.transform = "";
    };
    void import("framer-motion")
      .then(({ animate }) =>
        Promise.all(
          moved.map(({ el, dy }) =>
            animate(
              el,
              { transform: [`translateY(${dy}px)`, "translateY(0px)"] },
              { duration: 0.2, ease: EASE_OUT },
            ),
          ),
        ),
      )
      .then(clear, clear);
  }, [items]);

  const move = (index: number, dir: "up" | "down", event: MouseEvent) => {
    const to = dir === "up" ? index - 1 : index + 1;
    const item = items[index];
    if (!item) return;
    // event.detail is 0 for keyboard activation, so only pointer moves animate.
    if (event.detail > 0 && !reducedMotion()) {
      before.current = new Map(
        entries().map((el) => [el.dataset.entry ?? "", el.getBoundingClientRect().top]),
      );
    }
    pending.current = { kind: "move", id: item.id, dir };
    setNote(`${capital(noun)} moved ${dir} to position ${to + 1} of ${items.length}.`);
    onChange(moveItem(items, index, to));
  };

  const remove = (index: number) => {
    pending.current = { kind: "remove" };
    setNote(`${capital(noun)} ${index + 1} removed.`);
    onChange(removeItem(items, index));
  };

  const add = () => {
    const item = makeItem();
    pending.current = { kind: "add", id: item.id };
    setNote(`${capital(noun)} ${items.length + 1} added.`);
    onChange([...items, item]);
  };

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-4">
      <p className="sr-only" aria-live="polite">
        {note}
      </p>
      {items.length === 0 ? <p className="text-muted">{emptyText}</p> : null}
      {items.map((item, index) => {
        const n = index + 1;
        return (
          <fieldset
            key={item.id}
            data-entry={item.id}
            className="flex min-w-0 flex-col gap-4 border-t border-border pt-4"
          >
            <legend className="sr-only">
              {capital(noun)} {n}
            </legend>
            <div className="flex items-center justify-between gap-2">
              <p aria-hidden="true" className="font-semibold">
                {capital(noun)} {n}
              </p>
              <div role="group" aria-label={`${capital(noun)} ${n} actions`} className="flex gap-1">
                <IconButton
                  label={`Move ${noun} ${n} up`}
                  icon={<ArrowUp size={20} />}
                  data-action="up"
                  disabled={index === 0}
                  onClick={(e) => move(index, "up", e)}
                />
                <IconButton
                  label={`Move ${noun} ${n} down`}
                  icon={<ArrowDown size={20} />}
                  data-action="down"
                  disabled={index === items.length - 1}
                  onClick={(e) => move(index, "down", e)}
                />
                <IconButton
                  label={`Remove ${noun} ${n}`}
                  icon={<Trash2 size={20} />}
                  onClick={() => remove(index)}
                />
              </div>
            </div>
            {renderEntry(item, index, (patch) =>
              onChange(items.map((x) => (x.id === item.id ? { ...x, ...patch } : x))),
            )}
          </fieldset>
        );
      })}
      <div className="flex flex-col items-start gap-1">
        <Button ref={addButton} variant="secondary" disabled={items.length >= max} onClick={add}>
          <Plus aria-hidden="true" className="mr-2 size-4" />
          {addLabel}
        </Button>
        {items.length >= max ? (
          <p className="text-sm text-muted">
            You have reached the limit of {max} {noun}s.
          </p>
        ) : null}
      </div>
    </div>
  );
}
