import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { GUIDES, findGuide } from "@/content/guides";
import { isCountry } from "@/lib/countries";
import { stubMetadata } from "@/lib/seo";

type Params = { country: string; slug: string };
type Props = { params: Promise<Params> };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return GUIDES.map((g) => ({ country: g.country, slug: g.slug }));
}

async function resolve(params: Promise<Params>) {
  const { country, slug } = await params;
  if (!isCountry(country)) notFound();
  const guide = findGuide(country, slug);
  if (!guide) notFound();
  return { country, guide };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { guide } = await resolve(params);
  return stubMetadata({ title: guide.title, description: guide.summary });
}

export default async function GuidePage({ params }: Props) {
  const { country, guide } = await resolve(params);
  return (
    <article className="flex max-w-prose flex-col gap-4">
      <Badge className="self-start">Draft for human rewrite</Badge>
      <h1 className="font-display text-4xl font-extrabold">{guide.title}</h1>
      <p className="text-lg">{guide.summary}</p>
      {guide.paragraphs.map((text) => (
        <p key={text}>{text}</p>
      ))}
      <Link
        href={`/${country}/${guide.next.path}`}
        className="inline-flex min-h-11 items-center self-start text-base font-semibold text-primary underline underline-offset-4"
      >
        {guide.next.label}
      </Link>
    </article>
  );
}
