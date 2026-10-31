"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { attachContact, detachContact } from "@/lib/tracker/contacts";
import type { Contact, Job } from "@/lib/tracker/schema";
import { NativeSelect } from "./fields";

type Props = {
  job: Job;
  contacts: readonly Contact[];
  onChange: (job: Job) => void;
};

/** Contacts linked to one job. New contacts are added in the Contacts tab. */
export function JobContacts({ job, contacts, onChange }: Props) {
  const [pick, setPick] = useState("");
  const ids = job.contactIds ?? [];
  const linked = contacts.filter((c) => ids.includes(c.id));
  const free = contacts.filter((c) => !ids.includes(c.id));
  const now = () => new Date().toISOString();
  return (
    <section aria-labelledby="job-contacts-heading" className="flex min-w-0 flex-col gap-3">
      <h3 id="job-contacts-heading" className="font-display text-xl">
        Contacts
      </h3>
      {linked.length === 0 ? (
        <p className="text-muted">
          {contacts.length === 0
            ? "No contacts yet. Add people in the Contacts tab, then link them here."
            : "No one is linked to this job yet."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {linked.map((c) => (
            <li key={c.id} className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {c.role ? `${c.name}, ${c.role}` : c.name}
              </span>
              <Button
                variant="secondary"
                aria-label={`Unlink ${c.name}`}
                onClick={() => onChange(detachContact(job, c.id, now()))}
              >
                Unlink
              </Button>
            </li>
          ))}
        </ul>
      )}
      {free.length > 0 ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 md:flex-1">
            <NativeSelect
              label="Link a contact"
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              options={[
                { value: "", label: "Choose a contact" },
                ...free.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <Button
            variant="secondary"
            disabled={pick === ""}
            onClick={() => {
              onChange(attachContact(job, pick, now()));
              setPick("");
            }}
          >
            Link contact
          </Button>
        </div>
      ) : null}
    </section>
  );
}
