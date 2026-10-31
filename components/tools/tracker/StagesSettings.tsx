"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { deleteStage, renameStage, reorderStages, stageNameProblem } from "@/lib/tracker/logic";
import { STAGE_KINDS, stageSchema, type StageKind, type StageRecord } from "@/lib/tracker/schema";
import { NativeSelect } from "./fields";
import type { Tracker } from "./useTracker";

const KIND_NAMES: Record<StageKind, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  closed: "Closed",
};

const NAME_ERROR = "Enter a stage name of 1 to 40 characters.";

const PROBLEM_TEXT = {
  empty: NAME_ERROR,
  "too-long": NAME_ERROR,
  duplicate: "Another stage already has that name. Pick a different one.",
} as const;

export function StagesSettings({ t }: { t: Tracker }) {
  const { stages, jobs } = t.data;
  const sorted = [...stages].sort((a, b) => a.order - b.order);
  const [blocked, setBlocked] = useState<{ id: string; message: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<StageKind>("applied");
  const [newError, setNewError] = useState<string | undefined>();

  function remove(stage: StageRecord) {
    const result = deleteStage(sorted, stage.id, jobs);
    if (!result.ok && result.reason === "last-saved") {
      setBlocked({
        id: stage.id,
        message: "Keep at least one Saved stage. New jobs start there.",
      });
      return;
    }
    if (!result.ok) {
      const n = jobs.filter((j) => j.stageId === stage.id).length;
      setBlocked({
        id: stage.id,
        message: `${n === 1 ? "One job is" : `${n} jobs are`} in ${stage.name}. Move ${n === 1 ? "it" : "them"} to another stage first.`,
      });
      return;
    }
    setBlocked(null);
    t.actions.saveStages(result.stages);
    t.setAnnounce(`Deleted the stage ${stage.name}.`);
  }

  function add(event: FormEvent) {
    event.preventDefault();
    const parsed = stageSchema.safeParse({
      id: `stage-${crypto.randomUUID().slice(0, 8)}`,
      name: newName,
      order: sorted.length,
      kind: newKind,
    });
    if (!parsed.success) {
      setNewError(NAME_ERROR);
      return;
    }
    const clash = stageNameProblem(sorted, parsed.data.id, parsed.data.name);
    if (clash) {
      setNewError(PROBLEM_TEXT[clash]);
      return;
    }
    setNewError(undefined);
    setNewName("");
    t.actions.saveStages([...sorted, parsed.data]);
    t.setAnnounce(`Added the stage ${parsed.data.name}.`);
  }

  return (
    <section aria-labelledby="stages-heading" className="flex min-w-0 flex-col gap-4">
      <h3 id="stages-heading" className="font-display text-xl">
        Stages
      </h3>
      <p className="max-w-prose text-muted">
        Rename stages and put them in the order you work. A stage that holds jobs cannot be deleted.
      </p>
      <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface px-4">
        {sorted.map((stage, index) => (
          <li key={stage.id} className="flex min-w-0 flex-col gap-2 py-3">
            <StageRow
              stage={stage}
              problemWith={(name) => stageNameProblem(sorted, stage.id, name)}
              onRename={(name) => t.actions.saveStages(renameStage(sorted, stage.id, name))}
              canUp={index > 0}
              canDown={index < sorted.length - 1}
              canDelete={sorted.length > 1}
              onUp={() => t.actions.saveStages(reorderStages(sorted, stage.id, index - 1))}
              onDown={() => t.actions.saveStages(reorderStages(sorted, stage.id, index + 1))}
              onDelete={() => remove(stage)}
            />
            {blocked?.id === stage.id ? (
              <p role="alert" className="text-sm text-danger">
                {blocked.message}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <form onSubmit={add} noValidate className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-0 md:flex-1">
          <Input
            label="New stage name"
            value={newName}
            error={newError}
            onChange={(e) => setNewName(e.target.value)}
          />
        </div>
        <div className="min-w-0 md:w-56">
          <NativeSelect
            label="Counts as"
            hint="Metrics use this to count responses and offers."
            value={newKind}
            onChange={(e) => {
              const next = STAGE_KINDS.find((k) => k === e.target.value);
              if (next) setNewKind(next);
            }}
            options={STAGE_KINDS.map((k) => ({ value: k, label: KIND_NAMES[k] }))}
          />
        </div>
        <Button type="submit" variant="secondary">
          Add stage
        </Button>
      </form>
    </section>
  );
}

type RowProps = {
  stage: StageRecord;
  onRename: (name: string) => void;
  problemWith: (name: string) => "empty" | "too-long" | "duplicate" | null;
  canUp: boolean;
  canDown: boolean;
  canDelete: boolean;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
};

function StageRow({
  stage,
  onRename,
  problemWith,
  canUp,
  canDown,
  canDelete,
  onUp,
  onDown,
  onDelete,
}: RowProps) {
  const [name, setName] = useState(stage.name);
  const [error, setError] = useState<string | undefined>();

  function commit() {
    const clean = name.trim();
    if (clean === stage.name) {
      setError(undefined);
      return;
    }
    const problem = problemWith(clean);
    if (problem) {
      setError(PROBLEM_TEXT[problem]);
      return;
    }
    setError(undefined);
    setName(clean);
    onRename(clean);
  }

  return (
    <div className="flex min-w-0 items-end gap-2">
      <form
        className="min-w-0 flex-1"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <Input
          label={`Name of ${stage.name}`}
          value={name}
          error={error}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
        />
      </form>
      <IconButton
        label={`Move ${stage.name} up`}
        icon={<ArrowUp />}
        disabled={!canUp}
        onClick={onUp}
        variant="secondary"
      />
      <IconButton
        label={`Move ${stage.name} down`}
        icon={<ArrowDown />}
        disabled={!canDown}
        onClick={onDown}
        variant="secondary"
      />
      <IconButton
        label={`Delete ${stage.name}`}
        icon={<Trash2 />}
        disabled={!canDelete}
        onClick={onDelete}
        variant="secondary"
      />
    </div>
  );
}
