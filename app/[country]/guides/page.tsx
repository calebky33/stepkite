import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { guidesFor } from "@/content/guides";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireCountry(params);
  return stubMetadata({
    title: "Guides",
    description: "Plain guides on pay and job applications.",
  });
}

export default async function GuidesPage({ params }: Props) {
  const country = await requireCountry(params);
  const guides = guidesFor(country);
  return (
    <>
      <h1 className="font-display text-4xl font-extrabold">Guides</h1>
      {guides.length === 0 ? (
        <p className="text-muted">No guides here yet.</p>
      ) : (
        <ul className="flex max-w-prose flex-col gap-6">
          {guides.map((guide) => (
            <li key={guide.slug} className="flex flex-col gap-2">
              <Badge>Draft for human rewrite</Badge>
              <Link
                href={`/${country}/guides/${guide.slug}`}
                className="inline-flex min-h-11 items-center text-lg font-semibold text-primary underline underline-offset-4"
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
