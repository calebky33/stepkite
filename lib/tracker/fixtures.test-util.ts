import type { Job } from "./schema";

export const NOW = "2026-04-01T09:00:00.000Z";

export function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: "j1",
    title: "Dev",
    company: "Acme",
    stage: "saved",
    stageId: "stage-saved",
    notes: "",
    savedAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
    ...over,
  };
}
