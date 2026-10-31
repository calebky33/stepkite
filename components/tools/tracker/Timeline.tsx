"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import type { CountryCode } from "@/lib/countries";
import type { Activity } from "@/lib/tracker/schema";
import { formatWhen } from "./format";
import { TextArea } from "./fields";
import { usePanelDirty } from "./SidePanel";

const TYPE_LABELS: Record<Activity["type"], string> = {
  saved: "Saved",
  applied: "Applied",
  moved: "Moved",
  interview: "Interview",
  note: "Note",
  edited: "Edited",
};

const NOTE_ERROR = "Enter some text, up to 1,000 characters.";

type Props = {
  entries: readonly Activity[];
  country: CountryCode;
  onAdd: (text: string) => boolean;
  onEdit: (id: string, text: string) => boolean;
  onDelete: (entry: Activity) => void;
};

export function Timeline({ entries, country, onAdd, onEdit, onDelete }: Props) {
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | undefined>();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | undefined>();
  // After Save or Delete we hand focus back to this row's Edit button, so Tab order stays sensible.
  const refocus = useRef<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));

  const cancelEdit = () => {
    setEditing(null);
    setDraft("");
    setDraftError(undefined);
  };
  usePanelDirty(editing !== null, cancelEdit);

  function add(event: FormEvent) {
    event.preventDefault();
    if (onAdd(note)) {
      setNote("");
      setNoteError(undefined);
    } else setNoteError(NOTE_ERROR);
  }

  function saveEdit(event: FormEvent, entry: Activity) {
    event.preventDefault();
    if (draft.trim() === (entry.text ?? "")) {
      setEditing(null);
      refocus.current = entry.id;
      return;
    }
    if (onEdit(entry.id, draft)) {
      setEditing(null);
      setDraftError(undefined);
      refocus.current = entry.id;
    } else setDraftError(NOTE_ERROR);
  }

  // After the row swaps out of edit mode, send focus back to its Edit button.
  useEffect(() => {
    const id = refocus.current;
    if (!id || editing !== null) return;
    const button = list.current?.querySelector<HTMLElement>(`[data-entry-edit="${id}"]`);
    button?.focus();
    refocus.current = null;
  }, [editing, entries]);

  return (
    <section aria-labelledby="timeline-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="timeline-heading" className="font-display text-xl">
        Timeline
      </h3>
      <form onSubmit={add} noValidate className="flex flex-col gap-3">
        <TextArea
          label="Add a note to the timeline"
          value={note}
          error={noteError}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" variant="secondary" className="self-start">
          Add note
        </Button>
      </form>
      {sorted.length === 0 ? (
        <p className="text-muted">Nothing on the timeline yet. Notes and moves show here.</p>
      ) : (
        <ol ref={list} className="flex flex-col divide-y divide-border">
          {sorted.map((entry) => (
            <li key={entry.id} className="flex min-w-0 flex-col gap-2 py-3">
              {editing === entry.id ? (
                <form
                  onSubmit={(e) => saveEdit(e, entry)}
                  noValidate
                  className="flex flex-col gap-3"
                >
                  <Input
                    label={`Edit ${TYPE_LABELS[entry.type].toLowerCase()} entry`}
                    value={draft}
                    error={draftError}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button type="submit">Save entry</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(null);
                        setDraftError(undefined);
                        refocus.current = entry.id;
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-muted tabular-nums">
                      {`${TYPE_LABELS[entry.type]}, ${formatWhen(entry.at, country, true)}`}
                    </p>
                    {entry.text ? (
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.text}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0">
                    <IconButton
                      data-entry-edit={entry.id}
                      label={`Edit ${TYPE_LABELS[entry.type].toLowerCase()} entry from ${formatWhen(entry.at, country)}`}
                      icon={<Pencil />}
                      onClick={() => {
                        setEditing(entry.id);
                        setDraft(entry.text ?? "");
                        setDraftError(undefined);
                      }}
                    />
                    <IconButton
                      label={`Delete ${TYPE_LABELS[entry.type].toLowerCase()} entry from ${formatWhen(entry.at, country)}`}
                      icon={<Trash2 />}
                      onClick={() => onDelete(entry)}
                    />
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
