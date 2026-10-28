import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextArea } from "./TextArea";

const MAX_LINES = 12;
const MAX_CHARS = 300;

function toLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim());
}

function problem(lines: string[]): string | undefined {
  if (lines.length > MAX_LINES) return `Use ${MAX_LINES} lines or fewer. Remove the extra lines.`;
  if (lines.some((line) => line.length > MAX_CHARS)) {
    return `Keep each line under ${MAX_CHARS} characters.`;
  }
  return undefined;
}

export function ImpactEditor({
  items,
  onChange,
}: {
  items: readonly string[];
  onChange: (next: string[]) => void;
}) {
  // Keep the raw text so a new empty line typed at the end is not swallowed while typing.
  const [text, setText] = useState(items.join("\n"));
  const [synced, setSynced] = useState(items);
  if (items !== synced) {
    // The list changed from outside the editor, for example after an import.
    setSynced(items);
    if (items.join("\n") !== toLines(text).join("\n")) setText(items.join("\n"));
  }
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Quantified impact</h2>
      <TextArea
        label="Results you can measure, one per line"
        hint="Use your own figures only, like the number of orders you handled."
        error={problem(toLines(text))}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const kept = toLines(next).slice(0, MAX_LINES);
          setSynced(kept);
          onChange(kept);
        }}
      />
    </Card>
  );
}
