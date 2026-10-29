import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { guidesFor } from "@/content/guides";
import { COUNTRY_INFO } from "@/lib/countries";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { SITE_URL, stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await requireCountry(params);
  const name = COUNTRY_INFO[country].name;
  return stubMetadata({
    title: `Pay and job guides for ${name}`,
    description: `Plain guides on pay and job applications in ${name}.`,
    alternates: { canonical: `${SITE_URL}/${country}/guides` },
  });
}

export default async function GuidesPage({ params }: Props) {
  const country = await requireCountry(params);
  const guides = guidesFor(country);
  return (
    <>
      <h1 className="font-display text-4xl">Guides</h1>
      {guides.length === 0 ? (
        <p className="text-muted">No guides here yet.</p>
      ) : (
        <ul className="flex max-w-prose flex-col gap-6">
          {guides.map((guide) => (
            <li
              key={guide.slug}
              className="flex flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card"
            >
              <Badge>Draft for human rewrite</Badge>
              <Link
                href={`/${country}/guides/${guide.slug}`}
                className="inline-flex min-h-11 items-center text-lg font-semibold text-primary underline-offset-4 hover:underline"
              >
                {guide.title}
              </Link>
              <p className="text-muted">{guide.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
