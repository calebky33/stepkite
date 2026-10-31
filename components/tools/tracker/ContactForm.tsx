"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { contactSchema, type Contact } from "@/lib/tracker/schema";
import { TextArea } from "./fields";
import { fromInput, toDateInput } from "./format";

type Errors = Partial<
  Record<"name" | "role" | "company" | "email" | "phone" | "notes" | "last", string>
>;

type Props = { initial?: Contact; onSave: (contact: Contact) => void; onCancel: () => void };

const orUndefined = (v: string) => (v.trim() === "" ? undefined : v);

export function ContactForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [last, setLast] = useState(toDateInput(initial?.lastContactAt));
  const [errors, setErrors] = useState<Errors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    const lastAt = last.trim() === "" ? undefined : fromInput(last);
    if (last.trim() !== "" && !lastAt) found.last = "Enter a real date.";
    const parsed = contactSchema.safeParse({
      id: initial?.id ?? crypto.randomUUID(),
      name,
      role: orUndefined(role),
      company: orUndefined(company),
      email: orUndefined(email),
      phone: orUndefined(phone),
      notes: orUndefined(notes),
      lastContactAt: lastAt ?? undefined,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (key === "name")
          found.name ??=
            name.trim() === "" ? "Enter a name." : "Keep the name under 160 characters.";
        else if (key === "email") found.email ??= "Enter an email address like name@example.com.";
        else if (key === "role" || key === "company" || key === "phone" || key === "notes") {
          found[key] ??= "That is too long. Shorten it and try again.";
        }
      }
    }
    if (Object.keys(found).length > 0 || !parsed.success) {
      setErrors(found);
      return;
    }
    onSave(parsed.data);
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-4">
      <Input
        label="Name"
        value={name}
        error={errors.name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          label="Role"
          value={role}
          error={errors.role}
          onChange={(e) => setRole(e.target.value)}
        />
        <Input
          label="Company"
          value={company}
          error={errors.company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          inputMode="email"
          value={email}
          error={errors.email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          inputMode="tel"
          value={phone}
          error={errors.phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Input
        label="Last contact"
        type="date"
        value={last}
        error={errors.last}
        onChange={(e) => setLast(e.target.value)}
      />
      <TextArea
        label="Notes"
        value={notes}
        error={errors.notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Save contact</Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
