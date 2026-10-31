"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import type { CountryCode } from "@/lib/countries";
import { attachContact, detachContact } from "@/lib/tracker/contacts";
import type { Contact, Job } from "@/lib/tracker/schema";
import { ContactForm } from "./ContactForm";
import { NativeSelect } from "./fields";
import { formatWhen } from "./format";
import type { Tracker } from "./useTracker";

type Props = { t: Tracker; country: CountryCode };

export function ContactsView({ t, country }: Props) {
  const [form, setForm] = useState<"new" | Contact | null>(null);
  const { contacts, jobs } = t.data;
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {form ? (
        <Card className="flex flex-col gap-4 md:p-6">
          <h3 className="font-display text-xl">
            {form === "new" ? "Add a contact" : "Edit contact"}
          </h3>
          <ContactForm
            initial={form === "new" ? undefined : form}
            onSave={(c) => {
              t.actions.saveContact(c);
              setForm(null);
            }}
            onCancel={() => setForm(null)}
          />
        </Card>
      ) : (
        <Button className="self-start" onClick={() => setForm("new")}>
          Add a contact
        </Button>
      )}
      {sorted.length === 0 ? (
        <p className="text-muted">
          No contacts yet. Add a recruiter or a friend who can help, then link them to jobs.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {sorted.map((c) => (
            <li key={c.id}>
              <ContactCard
                contact={c}
                jobs={jobs}
                country={country}
                t={t}
                onEdit={() => setForm(c)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type CardProps = {
  contact: Contact;
  jobs: readonly Job[];
  country: CountryCode;
  t: Tracker;
  onEdit: () => void;
};

function ContactCard({ contact, jobs, country, t, onEdit }: CardProps) {
  const [pick, setPick] = useState("");
  const linked = jobs.filter((j) => j.contactIds?.includes(contact.id));
  const free = jobs.filter((j) => !j.archivedAt && !j.contactIds?.includes(contact.id));
  const now = () => new Date().toISOString();
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4 md:p-6">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold [overflow-wrap:anywhere]">{contact.name}</h3>
          <p className="text-muted [overflow-wrap:anywhere]">
            {[contact.role, contact.company].filter(Boolean).join(" at ") || "No role or company"}
          </p>
        </div>
        <div className="flex shrink-0">
          <IconButton label={`Edit ${contact.name}`} icon={<Pencil />} onClick={onEdit} />
          <IconButton
            label={`Delete ${contact.name}`}
            icon={<Trash2 />}
            onClick={() => t.actions.removeContact(contact)}
          />
        </div>
      </div>
      <dl className="grid gap-1 text-base [overflow-wrap:anywhere]">
        {contact.email ? <Line term="Email" value={contact.email} /> : null}
        {contact.phone ? <Line term="Phone" value={contact.phone} /> : null}
        {contact.lastContactAt ? (
          <Line term="Last contact" value={formatWhen(contact.lastContactAt, country)} />
        ) : null}
        {contact.notes ? <Line term="Notes" value={contact.notes} /> : null}
      </dl>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Linked jobs</p>
        {linked.length === 0 ? (
          <p className="text-muted">Not linked to a job yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {linked.map((j) => (
              <li key={j.id} className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 [overflow-wrap:anywhere]">{`${j.title}, ${j.company}`}</span>
                <Button
                  variant="secondary"
                  onClick={() => void t.actions.updateJob(detachContact(j, contact.id, now()))}
                  aria-label={`Unlink ${contact.name} from ${j.title}`}
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
                label={`Link ${contact.name} to a job`}
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                options={[
                  { value: "", label: "Choose a job" },
                  ...free.map((j) => ({ value: j.id, label: `${j.title}, ${j.company}` })),
                ]}
              />
            </div>
            <Button
              variant="secondary"
              disabled={pick === ""}
              onClick={() => {
                const job = jobs.find((j) => j.id === pick);
                if (job) void t.actions.updateJob(attachContact(job, contact.id, now()));
                setPick("");
              }}
            >
              Link job
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-muted">{term}</dt>
      <dd className="min-w-0 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}
