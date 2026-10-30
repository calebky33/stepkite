"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { moveItem } from "@/lib/cv/list";
import { SECTION_KEYS, type SectionKey } from "@/lib/cv/schema";

const NAMES: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  impact: "Quantified impact",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
  interests: "Interests",
  references: "References",
};

/** Same rule the preview uses: saved order first, then any section the older save lacked. */
export function fullOrder(order: readonly SectionKey[]): SectionKey[] {
  return [...new Set<SectionKey>([...order, ...SECTION_KEYS])];
}

export function SectionOrderEditor({
  doc = "CV",
  order,
  onChange,
}: {
  doc?: string;
  order: readonly SectionKey[];
  onChange: (next: SectionKey[]) => void;
}) {
  const list = fullOrder(order);
  const [note, setNote] = useState("");
  const move = (index: number, dir: -1 | 1) => {
    const key = list[index];
    if (!key) return;
    setNote(`${NAMES[key]} moved to position ${index + dir + 1} of ${list.length}.`);
    onChange(moveItem(list, index, index + dir));
  };
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Section order</h2>
      <p className="text-sm text-muted">Sections with nothing in them do not appear on your {doc}.</p>
      <p className="sr-only" aria-live="polite">
        {note}
      </p>
      <ol className="flex flex-col gap-1">
        {list.map((key, index) => (
          <li
            key={key}
            className="flex items-center justify-between gap-2 border-t border-border pt-1 first:border-t-0 first:pt-0"
          >
            <span>{NAMES[key]}</span>
            <span className="flex gap-1">
              <IconButton
                label={`Move ${NAMES[key]} up`}
                icon={<ArrowUp size={20} />}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              />
              <IconButton
                label={`Move ${NAMES[key]} down`}
                icon={<ArrowDown size={20} />}
                disabled={index === list.length - 1}
                onClick={() => move(index, 1)}
              />
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
