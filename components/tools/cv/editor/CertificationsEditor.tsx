import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";
import { EntryList } from "./EntryList";

type Item = Cv["certifications"][number];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function CertificationsEditor({
  doc = "CV",
  items,
  onChange,
}: {
  doc?: string;
  items: readonly Item[];
  onChange: (next: Item[]) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Certifications</h2>
      <EntryList
        noun="certification"
        items={items}
        max={15}
        onChange={onChange}
        addLabel="Add a certification"
        emptyText={`No certifications added. Leave this empty and it will not appear on your ${doc}.`}
        makeItem={() => ({ id: crypto.randomUUID(), name: "", issuer: "", date: null })}
        renderEntry={(item, _index, update) => (
          <>
            <Input
              label="Certification name"
              maxLength={120}
              value={item.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <Input
              label="Issued by"
              hint="Optional."
              maxLength={120}
              value={item.issuer}
              onChange={(e) => update({ issuer: e.target.value })}
            />
            <Input
              label="Date earned"
              type="month"
              hint="Optional."
              value={item.date ?? ""}
              error={
                item.date !== null && !MONTH.test(item.date)
                  ? "Use a year and month, like 2024-03."
                  : undefined
              }
              onChange={(e) => update({ date: e.target.value || null })}
            />
          </>
        )}
      />
    </Card>
  );
}
