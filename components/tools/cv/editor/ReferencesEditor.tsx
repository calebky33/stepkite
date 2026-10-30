import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";
import { EntryList } from "./EntryList";

type Item = Cv["references"][number];

export function ReferencesEditor({
  items,
  onChange,
}: {
  items: readonly Item[];
  onChange: (next: Item[]) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">References</h2>
      <EntryList
        noun="reference"
        items={items}
        max={4}
        onChange={onChange}
        addLabel="Add a reference"
        emptyText="No references added. Most employers ask for them later, so you can leave this empty."
        makeItem={() => ({ id: crypto.randomUUID(), name: "", role: "", contact: "" })}
        renderEntry={(item, _index, update) => (
          <>
            <Input
              label="Referee name"
              maxLength={120}
              value={item.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <Input
              label="Their role and employer"
              maxLength={120}
              value={item.role}
              onChange={(e) => update({ role: e.target.value })}
            />
            <Input
              label="Email or phone"
              hint="Only add someone who has agreed to be contacted."
              maxLength={120}
              value={item.contact}
              onChange={(e) => update({ contact: e.target.value })}
            />
          </>
        )}
      />
    </Card>
  );
}
