"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  draftHasErrors,
  orderForReview,
  unitErrors,
  type Conf,
  type DraftUnit,
  type ImportDraft,
} from "@/lib/cv/import/draft";
import { TextArea } from "./editor/TextArea";

const GROUPS: { conf: Conf; heading: string; note: string; badge: string }[] = [
  {
    conf: "low",
    heading: "Check these first",
    note: "We were not sure about these.",
    badge: "Check this",
  },
  {
    conf: "medium",
    heading: "Probably right",
    note: "Have a quick look.",
    badge: "Probably right",
  },
  { conf: "high", heading: "Looks right", note: "These matched clearly.", badge: "Looks right" },
];

export function ImportReview({
  draft,
  doc,
  fileName,
  notes,
  saving,
  saveError,
  onConfirm,
  onCancel,
}: {
  draft: ImportDraft;
  doc: string;
  fileName: string;
  notes: string[];
  saving: boolean;
  saveError: string;
  onConfirm: (units: DraftUnit[]) => void;
  onCancel: () => void;
}) {
  const [units, setUnits] = useState<DraftUnit[]>(() => orderForReview(draft.units));
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copyNote, setCopyNote] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => heading.current?.focus(), []);

  const change = (id: string, patch: (u: DraftUnit) => DraftUnit) => {
    setDirty(true);
    setUnits((all) => all.map((u) => (u.id === id ? patch(u) : u)));
  };

  const kept = units.filter((u) => u.accepted).length;
  const blocked = draftHasErrors(units);
  const reason = blocked
    ? "Fix the fields marked in red, or drop those items."
    : kept === 0
      ? `Keep at least one item to create your ${doc}.`
      : "";

  const requestClose = () => {
    if (dirty) setLeaving(true);
    else onCancel();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote("Copied.");
    } catch {
      setCopyNote("We could not copy. Select the text and copy it yourself.");
    }
  };

  const errorsById = useMemo(
    () => new Map(units.map((u) => [u.id, unitErrors(u)] as const)),
    [units],
  );

  return (
    <div
      className="flex flex-col gap-6"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !e.defaultPrevented && !leaving) requestClose();
      }}
    >
      <div className="flex flex-col gap-2">
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-2xl outline-none [overflow-wrap:anywhere]"
        >
          Check what we found in {fileName}
        </h2>
        <p className="max-w-prose text-muted">
          Nothing is saved until you choose Create my {doc}. Every item below is text from your
          file. Edit it, or switch off Keep for anything you do not want.
        </p>
        {[...notes, ...draft.warnings].map((w, i) => (
          <p key={`${i}-${w}`} className="text-sm">
            {w}
          </p>
        ))}
      </div>

      {units.length === 0 ? (
        <Card>
          <p>
            We could not match any section in this file. The text is listed under Not placed, so you
            can copy it into a new {doc} yourself.
          </p>
        </Card>
      ) : null}

      {GROUPS.map((group) => {
        const inGroup = units.filter((u) => u.confidence === group.conf);
        if (inGroup.length === 0) return null;
        return (
          <section key={group.conf} aria-label={group.heading} className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">{group.heading}</h3>
            <p className="text-sm text-muted">{group.note}</p>
            <ul className="flex flex-col gap-3">
              {inGroup.map((unit) => {
                const errors = errorsById.get(unit.id) ?? {};
                return (
                  <li key={unit.id}>
                    <Card className={unit.accepted ? "" : "opacity-60"}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <h4 className="font-semibold">{unit.title}</h4>
                          <Badge tone={group.conf === "low" ? "highlight" : "neutral"}>
                            {group.badge}
                          </Badge>
                        </div>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            className="size-5"
                            checked={unit.accepted}
                            onChange={(e) =>
                              change(unit.id, (u) => ({ ...u, accepted: e.target.checked }))
                            }
                          />
                          <span>
                            Keep<span className="sr-only"> this {unit.title.toLowerCase()}</span>
                          </span>
                        </label>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {unit.fields.map((f) => {
                          const update = (value: string) =>
                            change(unit.id, (u) => ({
                              ...u,
                              fields: u.fields.map((x) =>
                                x.name === f.name ? { ...x, value } : x,
                              ),
                            }));
                          const label = `${f.label} (${unit.title.toLowerCase()})`;
                          return f.multiline ? (
                            <div key={f.name} className="md:col-span-2">
                              <TextArea
                                label={label}
                                hint={f.hint}
                                error={unit.accepted ? errors[f.name] : undefined}
                                value={f.value}
                                maxLength={f.max}
                                disabled={!unit.accepted}
                                onChange={(e) => update(e.target.value)}
                              />
                            </div>
                          ) : (
                            <Input
                              key={f.name}
                              label={label}
                              hint={f.hint}
                              error={unit.accepted ? errors[f.name] : undefined}
                              value={f.value}
                              maxLength={f.max}
                              disabled={!unit.accepted}
                              onChange={(e) => update(e.target.value)}
                            />
                          );
                        })}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section aria-labelledby="not-placed" className="flex flex-col gap-3">
        <h3 id="not-placed" className="text-lg font-semibold">
          Not placed
        </h3>
        {draft.notPlaced.length === 0 ? (
          <p className="text-sm text-muted">Every line of text found a place.</p>
        ) : (
          <>
            <p className="text-sm text-muted">
              We did not know where these lines belong. Copy what you want and paste it into your{" "}
              {doc} afterwards.
            </p>
            <ul className="flex flex-col gap-2">
              {draft.notPlaced.map((line, i) => (
                <li
                  key={`${i}-${line}`}
                  className="flex items-start justify-between gap-3 rounded-input border border-border bg-surface-2 px-3 py-2"
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">{line}</span>
                  <Button
                    variant="ghost"
                    aria-label={`Copy line: ${line.slice(0, 40)}`}
                    onClick={() => void copy(line)}
                  >
                    Copy
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => void copy(draft.notPlaced.join("\n"))}
            >
              Copy all unplaced text
            </Button>
          </>
        )}
        <p role="status" className="text-sm">
          {copyNote}
        </p>
      </section>

      <div className="sticky bottom-0 -mx-1 flex flex-col gap-2 border-t border-border bg-bg px-1 py-3">
        {reason ? <p className="text-sm">{reason}</p> : null}
        {saveError ? (
          <p role="alert" className="text-sm text-danger">
            {saveError}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            loading={saving}
            disabled={blocked || kept === 0 || saving}
            onClick={() => onConfirm(units)}
          >
            Create my {doc}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={requestClose}>
            Cancel
          </Button>
        </div>
      </div>

      <Dialog
        open={leaving}
        onOpenChange={setLeaving}
        title={`Leave without creating a ${doc}?`}
        description="Your edits here will be lost. Nothing was saved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              Keep editing
            </Button>
            <Button onClick={onCancel}>Leave</Button>
          </>
        }
      />
    </div>
  );
}
