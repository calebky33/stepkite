"use client";

import { Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import type { CountryCode } from "@/lib/countries";
import type { Interview } from "@/lib/tracker/schema";
import { EDIT_ATTR } from "./focusReturn";
import { formatWhen } from "./format";
import { KIND_NAMES } from "./InterviewForm";

type Props = {
  interview: Interview;
  country: CountryCode;
  /** Shown when the row sits outside a job, so people know which job it is for. */
  jobLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function InterviewRow({ interview, country, jobLabel, onEdit, onDelete }: Props) {
  const when = formatWhen(interview.at, country, true);
  return (
    <div className="flex min-w-0 items-start justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-semibold tabular-nums">{`${KIND_NAMES[interview.kind]}, ${when}`}</p>
        {jobLabel ? <p className="text-muted [overflow-wrap:anywhere]">{jobLabel}</p> : null}
        {interview.people ? (
          <p className="[overflow-wrap:anywhere]">{`With ${interview.people}`}</p>
        ) : null}
        {interview.prep ? (
          <p className="whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">
            {`Prep: ${interview.prep}`}
          </p>
        ) : null}
        {interview.result ? (
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
            {`Result: ${interview.result}`}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0">
        <IconButton
          label={`Edit interview on ${when}`}
          icon={<Pencil />}
          onClick={onEdit}
          {...{ [EDIT_ATTR]: interview.id }}
        />
        <IconButton label={`Delete interview on ${when}`} icon={<Trash2 />} onClick={onDelete} />
      </div>
    </div>
  );
}
