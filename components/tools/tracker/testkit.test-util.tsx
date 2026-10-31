import { fireEvent, screen } from "@testing-library/react";
import { seed } from "@/lib/storage/memoryDb";

export const NOW_ISO = "2026-10-01T10:00:00.000Z";

/** A job as stored today. */
export function storedJob(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    title: `Role ${id}`,
    company: "Northwind",
    stageId: "stage-saved",
    notes: "",
    savedAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...over,
  };
}

/** A job as the first version stored it, with the old fixed stage and no stage records. */
export function legacyJob(id: string, stage: string, over: Record<string, unknown> = {}) {
  return { id, title: `Legacy ${id}`, company: "Studio", stage, updatedAt: NOW_ISO, ...over };
}

export function seedJobs(jobs: readonly Record<string, unknown>[]): void {
  for (const job of jobs) seed("jobs", String(job.id), job);
}

/** Radix tabs switch on mouse down or focus, not on click. */
export function openTab(name: string): void {
  fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
}

export function type(label: string | RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
