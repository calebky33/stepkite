import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Cv } from "@/lib/cv/schema";
import { EntryList } from "./EntryList";
import { TextArea } from "./TextArea";

type Job = Cv["experience"][number];

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_ERROR = "Use a year and month, like 2024-03.";
const MAX_BULLETS = 12;
const MAX_BULLET_CHARS = 300;

function newId(): string {
  return crypto.randomUUID();
}

function bulletError(bullets: string[]): string | undefined {
  if (bullets.length > MAX_BULLETS) {
    return `Use ${MAX_BULLETS} lines or fewer. Remove the extra lines.`;
  }
  if (bullets.some((b) => b.length > MAX_BULLET_CHARS)) {
    return `Keep each line under ${MAX_BULLET_CHARS} characters.`;
  }
  return undefined;
}

export function ExperienceEditor({
  items,
  onChange,
}: {
  items: readonly Job[];
  onChange: (next: Job[]) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Experience</h2>
      <EntryList
        noun="job"
        items={items}
        max={20}
        onChange={onChange}
        addLabel="Add a job"
        emptyText="No jobs added yet. Add your most recent job first."
        makeItem={() => ({
          id: newId(),
          role: "",
          employer: "",
          location: "",
          start: new Date().toISOString().slice(0, 7),
          end: null,
          bullets: [],
        })}
        renderEntry={(job, _index, update) => {
          const startBad = !MONTH.test(job.start);
          const endBad = job.end !== null && !MONTH.test(job.end);
          const backwards = !startBad && !endBad && job.end !== null && job.end < job.start;
          return (
            <>
              <Input
                label="Job title"
                maxLength={120}
                value={job.role}
                onChange={(e) => update({ role: e.target.value })}
              />
              <Input
                label="Employer"
                maxLength={120}
                value={job.employer}
                onChange={(e) => update({ employer: e.target.value })}
              />
              <Input
                label="Location"
                maxLength={120}
                value={job.location}
                onChange={(e) => update({ location: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Start"
                  type="month"
                  value={job.start}
                  error={startBad ? "Choose a start month." : undefined}
                  onChange={(e) => update({ start: e.target.value })}
                />
                <Input
                  label="End"
                  type="month"
                  hint="Leave empty if you still work here."
                  value={job.end ?? ""}
                  error={
                    endBad
                      ? MONTH_ERROR
                      : backwards
                        ? "The end month is before the start month."
                        : undefined
                  }
                  onChange={(e) => update({ end: e.target.value || null })}
                />
              </div>
              <TextArea
                label="What you did, one line each"
                hint={`Up to ${MAX_BULLETS} lines.`}
                error={bulletError(job.bullets)}
                value={job.bullets.join("\n")}
                onChange={(e) => update({ bullets: e.target.value.split("\n") })}
              />
            </>
          );
        }}
      />
    </Card>
  );
}
