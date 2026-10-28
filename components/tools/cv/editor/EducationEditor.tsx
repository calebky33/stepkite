import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";
import { EntryList } from "./EntryList";
import { TextArea } from "./TextArea";

type Item = Cv["education"][number];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_ERROR = "Use a year and month, like 2024-03.";

function newId(): string {
  return crypto.randomUUID();
}

export function EducationEditor({
  items,
  onChange,
}: {
  items: readonly Item[];
  onChange: (next: Item[]) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Education</h2>
      <EntryList
        noun="qualification"
        items={items}
        max={10}
        onChange={onChange}
        addLabel="Add a qualification"
        emptyText="No education added yet. Add your highest qualification."
        makeItem={() => ({
          id: newId(),
          qualification: "",
          institution: "",
          start: null,
          end: null,
          details: "",
        })}
        renderEntry={(item, _index, update) => {
          const startBad = item.start !== null && !MONTH.test(item.start);
          const endBad = item.end !== null && !MONTH.test(item.end);
          return (
            <>
              <Input
                label="Qualification"
                maxLength={120}
                value={item.qualification}
                onChange={(e) => update({ qualification: e.target.value })}
              />
              <Input
                label="School or university"
                maxLength={120}
                value={item.institution}
                onChange={(e) => update({ institution: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Started"
                  type="month"
                  hint="Optional."
                  value={item.start ?? ""}
                  error={startBad ? MONTH_ERROR : undefined}
                  onChange={(e) => update({ start: e.target.value || null })}
                />
                <Input
                  label="Finished"
                  type="month"
                  hint="Leave empty if you have not finished."
                  value={item.end ?? ""}
                  error={endBad ? MONTH_ERROR : undefined}
                  onChange={(e) => update({ end: e.target.value || null })}
                />
              </div>
              <TextArea
                label="Details"
                hint="Optional. Grade, subjects or a project."
                maxLength={500}
                value={item.details}
                onChange={(e) => update({ details: e.target.value })}
              />
            </>
          );
        }}
      />
    </Card>
  );
}
