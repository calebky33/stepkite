import type { Contact, Job } from "./schema";

export function attachContact(job: Job, contactId: string, now: string): Job {
  const ids = job.contactIds ?? [];
  if (ids.includes(contactId)) return job;
  return { ...job, contactIds: [...ids, contactId], updatedAt: now };
}

export function detachContact(job: Job, contactId: string, now: string): Job {
  const ids = job.contactIds ?? [];
  if (!ids.includes(contactId)) return job;
  return { ...job, contactIds: ids.filter((id) => id !== contactId), updatedAt: now };
}

/** Drops the contact and unlinks it from every job. `changedJobIds` says which jobs to save. */
export function deleteContact(
  contactId: string,
  contacts: readonly Contact[],
  jobs: readonly Job[],
  now: string,
): { contacts: Contact[]; jobs: Job[]; changedJobIds: string[] } {
  const nextJobs = jobs.map((j) => detachContact(j, contactId, now));
  return {
    contacts: contacts.filter((c) => c.id !== contactId),
    jobs: nextJobs,
    changedJobIds: nextJobs.filter((j, i) => j !== jobs[i]).map((j) => j.id),
  };
}
