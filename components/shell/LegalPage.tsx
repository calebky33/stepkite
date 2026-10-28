import { Card } from "@/components/ui/Card";
import { PageShell } from "./PageShell";

export type LegalSection = { heading: string; paragraphs: string[] };

type LegalPageProps = {
  title: string;
  lead: string;
  sections: LegalSection[];
};

/** Plain draft text with a visible note, until a lawyer has read it. */
export function LegalPage({ title, lead, sections }: LegalPageProps) {
  return (
    <PageShell title={title} lead={lead} narrow>
      <Card className="mb-8 p-4" role="note">
        <p className="text-base font-semibold">Draft, needs legal review</p>
        <p className="text-sm text-muted">
          Written on 28 October 2026. It describes what the site does today, in plain words.
        </p>
      </Card>
      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-display text-[22px] font-extrabold">{section.heading}</h2>
            {section.paragraphs.map((text) => (
              <p key={text} className="text-base">
                {text}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
