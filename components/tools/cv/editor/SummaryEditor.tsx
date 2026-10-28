import { Card } from "@/components/ui/Card";
import { TextArea } from "./TextArea";

export function SummaryEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Summary</h2>
      <TextArea
        label="Two or three lines about the work you do"
        hint="Name your role and one result you are proud of."
        maxLength={4000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Card>
  );
}
