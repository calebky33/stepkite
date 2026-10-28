import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";
import { EntryList } from "./EntryList";

type Group = Cv["skills"][number];

const MAX_SKILLS = 40;

function newId(): string {
  return crypto.randomUUID();
}

function parse(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SkillsEditor({
  items,
  onChange,
}: {
  items: readonly Group[];
  onChange: (next: Group[]) => void;
}) {
  // Keep the raw text so a comma typed at the end is not swallowed while the user types.
  const [texts, setTexts] = useState<Record<string, string>>({});
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Skills</h2>
      <EntryList
        noun="skill group"
        items={items}
        max={10}
        onChange={onChange}
        addLabel="Add a skill group"
        emptyText="No skills added yet. Add the tools and strengths you use at work."
        makeItem={() => ({ id: newId(), label: "", items: [] })}
        renderEntry={(group, _index, update) => {
          const text = texts[group.id] ?? group.items.join(", ");
          const tooMany = parse(text).length > MAX_SKILLS;
          return (
            <>
              <Input
                label="Group name"
                hint="For example Tools or Languages. Optional."
                maxLength={120}
                value={group.label}
                onChange={(e) => update({ label: e.target.value })}
              />
              <Input
                label="Skills"
                hint="Separate each skill with a comma."
                error={tooMany ? `Only the first ${MAX_SKILLS} skills are kept.` : undefined}
                value={text}
                onChange={(e) => {
                  const next = e.target.value;
                  setTexts((t) => ({ ...t, [group.id]: next }));
                  update({ items: parse(next).slice(0, MAX_SKILLS) });
                }}
              />
            </>
          );
        }}
      />
    </Card>
  );
}
