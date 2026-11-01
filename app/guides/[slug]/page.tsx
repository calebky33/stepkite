import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, listGuides, renderBody } from "@/lib/guides-md";
import { SITE_URL } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listGuides()).map((g) => ({ slug: g.slug }));
}

async function load(params: Props["params"]) {
  const { slug } = await params;
  try {
    return await getGuide(slug);
  } catch {
    notFound();
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await load(params);
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `${SITE_URL}/guides/${g.slug}` },
  };
}

export default async function GuidePage({ params }: Props) {
  const g = await load(params);
  const url = `${SITE_URL}/guides/${g.slug}`;
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.description,
    datePublished: g.published,
    mainEntityOfPage: url,
    author: { "@type": "Person", name: "Caleb" },
    publisher: { "@type": "Organization", name: "Stepkite", url: SITE_URL },
  };
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
      { "@type": "ListItem", position: 3, name: g.title, item: url },
    ],
  };
  return (
    <article className="mx-auto flex w-full max-w-prose flex-col gap-4 px-4 py-8 leading-relaxed md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([article, crumbs]).replace(/</g, "\\u003c"),
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="underline-offset-4 hover:underline">
          Home
        </Link>
        {" > "}
        <Link href="/guides" className="underline-offset-4 hover:underline">
          Guides
        </Link>
      </nav>
      <h1 className="font-display text-[28px] leading-tight md:text-4xl [overflow-wrap:anywhere]">
        {g.title}
      </h1>
      <p className="border-b border-border pb-6 text-lg text-muted">{g.description}</p>
      {renderBody(g.body)}
    </article>
  );
}
