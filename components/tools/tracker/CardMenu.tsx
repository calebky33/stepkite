"use client";

import { Archive, MoreHorizontal, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { IconButton } from "@/components/ui/IconButton";
import type { Job, StageRecord } from "@/lib/tracker/schema";

type Props = {
  job: Job;
  stages: readonly StageRecord[];
  onMove: (stageId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
};

const ITEM =
  "flex min-h-11 w-full items-center gap-2 rounded-input px-3 text-left text-base hover:bg-surface-2";

/**
 * A list of actions that opens under the card. It opens in place, not as a floating layer,
 * so a scrolling board cannot clip it. Escape, outside click or focus leaving the menu close
 * it, and focus returns to the trigger.
 */
export function CardMenu({ job, stages, onMove, onArchive, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const listId = useId();

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      toggle.current?.focus();
    }
  }

  useEffect(() => {
    if (!open) return;
    const node = list.current;
    const closeOnPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toggle.current?.contains(target) || node?.contains(target)) return;
      setOpen(false);
    };
    const closeOnFocusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (!next) {
        // Blur with no next target (clicked outside) is handled by closeOnPointer.
        return;
      }
      if (toggle.current?.contains(next) || node?.contains(next)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", closeOnPointer);
    document.addEventListener("touchstart", closeOnPointer);
    node?.addEventListener("focusout", closeOnFocusOut);
    return () => {
      document.removeEventListener("mousedown", closeOnPointer);
      document.removeEventListener("touchstart", closeOnPointer);
      node?.removeEventListener("focusout", closeOnFocusOut);
    };
  }, [open]);

  const done = (run: () => void) => () => {
    setOpen(false);
    run();
  };

  return (
    <div onKeyDown={onKeyDown} className="contents">
      <IconButton
        ref={toggle}
        variant="secondary"
        label={`More actions for ${job.title}`}
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        icon={<MoreHorizontal />}
        onClick={() => setOpen((v) => !v)}
      />
      {open ? (
        <ul
          ref={list}
          id={listId}
          className="basis-full rounded-card border border-border bg-surface p-1"
        >
          {stages
            .filter((s) => s.id !== job.stageId)
            .map((s) => (
              <li key={s.id}>
                <button type="button" className={ITEM} onClick={done(() => onMove(s.id))}>
                  <span className="[overflow-wrap:anywhere]">{`Move to ${s.name}`}</span>
                </button>
              </li>
            ))}
          <li>
            <button type="button" className={ITEM} onClick={done(onArchive)}>
              <Archive size={18} aria-hidden="true" />
              <span className="[overflow-wrap:anywhere]">{`Archive ${job.title}`}</span>
            </button>
          </li>
          <li>
            <button type="button" className={ITEM} onClick={done(onDelete)}>
              <Trash2 size={18} aria-hidden="true" className="text-danger" />
              <span className="[overflow-wrap:anywhere]">{`Delete ${job.title}`}</span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
