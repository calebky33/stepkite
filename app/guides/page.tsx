import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/shell/PageShell";
import { listGuides } from "@/lib/guides-md";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pay and CV guides",
  description: "Plain guides on reading your payslip, how US tax brackets work and writing a CV.",
  alternates: { canonical: `${SITE_URL}/guides` },
};

export default async function GuidesIndex() {
  const guides = await listGuides();
  return (
    <PageShell title="Guides" lead="Plain guides on pay, tax and job applications." narrow>
      <ul className="flex flex-col gap-6">
        {guides.map((g) => (
          <li
            key={g.slug}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card"
          >
            <span className="text-sm text-muted">{g.region}</span>
            <Link
              href={`/guides/${g.slug}`}
              className="inline-flex min-h-11 items-center text-lg font-semibold text-primary underline-offset-4 hover:underline"
            >
              {g.title}
            </Link>
            <p className="text-muted">{g.description}</p>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
