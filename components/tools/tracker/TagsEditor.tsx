"use client";

import { X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Job } from "@/lib/tracker/schema";
import { TAG_MAX_COUNT, TAG_MAX_LENGTH, addTag, removeTag } from "@/lib/tracker/tags";

type Props = { job: Job; onChange: (job: Job) => void };

export function TagsEditor({ job, onChange }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | undefined>();
  const tags = job.tags ?? [];

  function add(event: FormEvent) {
    event.preventDefault();
    const next = addTag(job, text);
    if (!next) {
      setError(
        `Use up to ${TAG_MAX_COUNT} tags. Each one is different and under ${TAG_MAX_LENGTH} characters.`,
      );
      return;
    }
    setError(undefined);
    setText("");
    onChange(next);
  }

  return (
    <section aria-labelledby="tags-heading" className="flex min-w-0 flex-col gap-3">
      <h3 id="tags-heading" className="font-display text-xl">
        Tags
      </h3>
      {tags.length === 0 ? (
        <p className="text-muted">No tags yet. Tags help you find jobs later.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="flex min-w-0 items-center gap-1 rounded-full bg-accent-soft pl-3"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">{tag}</span>
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                onClick={() => onChange(removeTag(job, tag))}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} noValidate className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="min-w-0 md:flex-1">
          <Input
            label="Add a tag"
            value={text}
            error={error}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">
          Add tag
        </Button>
      </form>
    </section>
  );
}
