"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { COUNTRY_INFO } from "@/lib/countries";
import { useSavedCountry } from "@/lib/countryPreference";

const LINK_CLASS = "flex min-h-11 w-full items-center justify-between gap-3 rounded-input border border-border bg-surface px-4 py-3 text-base font-medium text-text transition-colors duration-150 ease-[var(--ease-out)] hover:bg-surface-2";

export function QuickActions() {
  const country = useSavedCountry();
  const info = COUNTRY_INFO[country];
  const doc = info.cvName;
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Your work</h2>
      <p className="text-base text-muted">
        Jump to the tools. Your {doc} is saved on this device.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <Link href={`/${country}/cv`} className={LINK_CLASS} data-action="open-cv">
          <span>Open my {doc}</span>
          <span aria-hidden className="text-sm text-muted">Go</span>
        </Link>
        <Link
          href={`/${country}/cv?import=1`}
          className={LINK_CLASS}
          data-action="upload-cv"
        >
          <span>Upload a {doc}</span>
          <span aria-hidden className="text-sm text-muted">Pick a file</span>
        </Link>
        <Link href={`/${country}/tracker`} className={LINK_CLASS} data-action="open-tracker">
          <span>Open the job tracker</span>
          <span aria-hidden className="text-sm text-muted">Go</span>
        </Link>
        <Link href={`/${country}/match`} className={LINK_CLASS} data-action="open-match">
          <span>Match a job ad</span>
          <span aria-hidden className="text-sm text-muted">Go</span>
        </Link>
      </div>
    </Card>
  );
}
