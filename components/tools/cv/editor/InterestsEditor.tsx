import { Card } from "@/components/ui/Card";
import { TextArea } from "./TextArea";

export function InterestsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Interests</h2>
      <TextArea
        label="Interests outside work"
        hint="Optional. One or two lines. Leave it empty and it will not appear on your CV."
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Card>
  );
}
