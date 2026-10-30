"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { atsSectionName, type AtsReport, type AtsSection } from "@/lib/cv/ats";

/** Ids the editor puts on each section wrapper. */
export const sectionDomId = (section: AtsSection): string => `cv-section-${section}`;

/** Moves keyboard focus to the first field in a section, so the fix starts there. */
export function focusSection(section: AtsSection): void {
  const el = document.getElementById(sectionDomId(section));
  if (!el) return;
  el.scrollIntoView({ block: "center" });
  const target =
    el.querySelector<HTMLElement>(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
    ) ?? el.querySelector<HTMLElement>("button:not([disabled])");
  target?.focus();
}

export function AtsPanel({ report, doc }: { report: AtsReport; doc: string }) {
  const count = report.flags.length;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">ATS check</h2>
      <p className="text-sm text-muted">
        Applicant tracking systems read your {doc} as plain text. These checks update as you type.
        None of them stops you downloading.
      </p>
      <p aria-live="polite" className="font-medium">
        {count === 0
          ? "Nothing to fix."
          : `${count} ${count === 1 ? "thing" : "things"} to look at.`}
      </p>
      {count > 0 ? (
        <ul className="flex flex-col gap-3">
          {report.flags.map((flag) => (
            <li key={flag.id} className="flex flex-col items-start gap-1">
              <p>{flag.message}</p>
              <Button
                variant="secondary"
                aria-label={`Go to ${flag.field} in ${atsSectionName(flag.section)}`}
                onClick={() => focusSection(flag.section)}
              >
                Go to {flag.field}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {report.passes.length > 0 ? (
        <>
          <h3 className="text-base font-semibold">Looks fine</h3>
          <ul className="list-disc ps-5 text-sm text-muted">
            {report.passes.map((pass) => (
              <li key={pass}>{pass}</li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}
