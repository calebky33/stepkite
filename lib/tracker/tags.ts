import type { Job } from "./schema";

export const TAG_MAX_COUNT = 10;
export const TAG_MAX_LENGTH = 30;

/** Adds a tag. Null when it is empty, too long, already there (any case) or the job is full. */
export function addTag(job: Job, tag: string): Job | null {
  const clean = tag.trim();
  const tags = job.tags ?? [];
  if (clean === "" || clean.length > TAG_MAX_LENGTH || tags.length >= TAG_MAX_COUNT) return null;
  if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return null;
  return { ...job, tags: [...tags, clean] };
}

export function removeTag(job: Job, tag: string): Job {
  const tags = job.tags ?? [];
  if (!tags.includes(tag)) return job;
  return { ...job, tags: tags.filter((t) => t !== tag) };
}

/** Jobs carrying the tag. A blank tag returns every job. */
export function filterByTag(jobs: readonly Job[], tag: string): Job[] {
  const wanted = tag.trim().toLowerCase();
  if (wanted === "") return [...jobs];
  return jobs.filter((j) => (j.tags ?? []).some((t) => t.toLowerCase() === wanted));
}
