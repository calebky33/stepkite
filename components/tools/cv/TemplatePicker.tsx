"use client";

import { useId } from "react";
import { Badge } from "@/components/ui/Badge";
import type { CountryCode } from "@/lib/countries";
import { resolveTemplate, templatesFor } from "./templates";

/** Native radios: arrow keys, focus and screen reader roles come for free. */
export function TemplatePicker({
  country,
  value,
  onChange,
}: {
  country: CountryCode;
  value: string;
  onChange: (id: string) => void;
}) {
  const group = useId();
  const current = resolveTemplate(country, value).id;
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-semibold">Template</legend>
      <p className="text-sm text-muted">Switching template never changes your words.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {templatesFor(country).map((t) => (
          <label
            key={t.id}
            className="relative flex min-h-11 min-w-0 cursor-pointer flex-col items-start gap-1 rounded-input border border-border-strong p-3 transition-colors duration-150 ease-[var(--ease-out)] has-[:checked]:border-primary has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
          >
            <input
              type="radio"
              name={group}
              value={t.id}
              checked={current === t.id}
              onChange={() => onChange(t.id)}
              className="sr-only"
            />
            <span className="font-semibold [overflow-wrap:anywhere]">{t.name}</span>
            <span className="text-sm text-muted [overflow-wrap:anywhere]">{t.description}</span>
            <Badge>Placeholder template</Badge>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
