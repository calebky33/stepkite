"use client";

import { DataSettings } from "./DataSettings";
import { ImportBackup } from "./ImportBackup";
import { ImportCsv } from "./ImportCsv";
import { StagesSettings } from "./StagesSettings";
import type { Tracker } from "./useTracker";

export function SettingsView({ t, currency }: { t: Tracker; currency: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      <StagesSettings t={t} />
      <DataSettings t={t} />
      <ImportCsv stages={t.data.stages} currency={currency} onImport={t.actions.importJobs} />
      <ImportBackup onRestore={t.actions.restoreBackup} />
    </div>
  );
}
