import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { buildDraft } from "./draft";
import { UK_CV, US_CV, IN_CV, CJK_CV } from "./fixtures";
it("probe", () => {
  const out = [UK_CV, US_CV, IN_CV, CJK_CV].map((t) => {
    const d = buildDraft(t);
    return {
      u: d.units.map((u) => [u.kind, u.confidence, ...u.fields.map((f) => f.value)]),
      n: d.notPlaced,
      w: d.warnings,
    };
  });
  writeFileSync(
    "C:/Users/USER/AppData/Local/Temp/claude/C--Users-USER-stepkite/868ff336-e31e-4070-bf73-7aa12e8a0200/scratchpad/probe.json",
    JSON.stringify(out, null, 1),
  );
});
