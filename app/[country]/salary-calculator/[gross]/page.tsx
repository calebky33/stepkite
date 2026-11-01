import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdSlot } from "@/components/shell/AdSlot";
import { ToolLinks } from "@/components/tools/ToolLinks";
import {
  COUNTRIES,
  COUNTRY_INFO,
  COUNTRY_SHORT_NAME,
  formatMoney,
  isCountry,
  type CountryCode,
} from "@/lib/countries";
import { SEO_SALARY_LEVELS } from "@/lib/salaryLevels";
import { computeSalary } from "@/lib/salaryPages";
import { INDEXABLE_PATHS, SITE_URL, stubMetadata } from "@/lib/seo";
import { getRates } from "@/lib/tax";

type Params = { country: string; gross: string };
type Props = { params: Promise<Params> };

export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return COUNTRIES.flatMap((country) =>
    SEO_SALARY_LEVELS[country].map((gross) => ({ country, gross: String(gross) })),
  );
}

function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function titleFor(country: CountryCode, gross: number): string {
  return `${formatMoney(gross, country)} after tax in ${
    country === "in" ? "India" : `the ${COUNTRY_SHORT_NAME[country]}`
  }`;
}

async function resolve(params: Promise<Params>) {
  const { country, gross: raw } = await params;
  if (!isCountry(country) || !/^\d+$/.test(raw)) notFound();
  const gross = Number(raw);
  if (!SEO_SALARY_LEVELS[country].includes(gross)) notFound();
  const result = await computeSalary(country, gross);
  if (!result) notFound();
  return { country, gross, result };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country, gross, result } = await resolve(params);
  const info = COUNTRY_INFO[country];
  const path = `/${country}/salary-calculator/${gross}`;
  const title = titleFor(country, gross);
  const description = `A ${formatMoney(gross, country)} salary leaves about ${formatMoney(result.net, country)} a year (${formatMoney(result.perPeriod.month, country)} a month) in ${info.name}. See the tax breakdown.`;
  const meta: Metadata = {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}${path}`,
      images: [
        `/api/og?${new URLSearchParams({ title, subtitle: `About ${formatMoney(result.net, country)} a year`, country })}`,
      ],
    },
  };
  const indexable = getRates(country).loaded && INDEXABLE_PATHS.includes(path);
  return indexable ? meta : stubMetadata(meta);
}

export default async function SalaryLevelPage({ params }: Props) {
  const { country, gross, result } = await resolve(params);
  const info = COUNTRY_INFO[country];
  const rates = getRates(country);
  const money = (n: number) => formatMoney(n, country);
  const title = titleFor(country, gross);
  const base = `${SITE_URL}/${country}/salary-calculator`;
  const url = `${base}/${gross}`;
  const sources = [
    ...new Map(
      result.lines
        .filter((l) => l.source)
        .map((l) => [l.source, { href: l.source ?? "", label: l.sourceLabel ?? l.source }]),
    ).values(),
  ];

  const faqs = [
    {
      question: `How much is ${money(gross)} a month after tax?`,
      answer: `About ${money(result.perPeriod.month)} a month, or ${money(result.perPeriod.week)} a week, before any pension or other deductions of your own.`,
    },
    {
      question: `What is left out of this ${info.takeHomeTerm} figure?`,
      answer:
        result.assumptions[0] ??
        "The figure uses standard settings. Open the calculator to change them.",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url,
      inLanguage: info.locale,
      isPartOf: { "@type": "WebSite", name: "Stepkite", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: info.name, item: `${SITE_URL}/${country}` },
        { "@type": "ListItem", position: 3, name: "Salary calculator", item: base },
        { "@type": "ListItem", position: 4, name: title, item: url },
      ],
    },
  ];

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href={`/${country}`}>{info.name}</Link>
          </li>
          <li>
            <Link href={`/${country}/salary-calculator`}>Salary calculator</Link>
          </li>
          <li aria-current="page">{money(gross)}</li>
        </ol>
      </nav>
      <h1 className="font-display text-4xl">{title}</h1>
      <p className="max-w-prose text-lg">
        Your {info.takeHomeTerm} is about <strong>{money(result.net)}</strong> a year, or{" "}
        {money(result.perPeriod.month)} a month.
      </p>
      <section aria-labelledby="breakdown-heading" className="max-w-prose space-y-2">
        <h2 id="breakdown-heading" className="font-display text-2xl">
          Where the money goes
        </h2>
        <table className="w-full text-left">
          <caption className="sr-only">Breakdown of a {money(gross)} salary</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="text-right">
                Per year
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className="font-normal">
                Gross salary
              </th>
              <td className="text-right">{money(gross)}</td>
            </tr>
            {result.lines.map((l) => (
              <tr key={l.key}>
                <th scope="row" className="font-normal">
                  {l.label}
                </th>
                <td className="text-right">{money(l.amount)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Take-home</th>
              <td className="text-right font-semibold">{money(result.net)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-muted">
          {rates.taxYear} tax year rates, last checked {rates.verifiedOn ?? "not yet"}. Sources:{" "}
          {sources.map((s, i) => (
            <span key={s.href}>
              {i > 0 ? ", " : ""}
              <a href={s.href} rel="noopener noreferrer">
                {s.label}
              </a>
            </span>
          ))}
          .
        </p>
      </section>
      <p>
        <Link
          href={`/${country}/salary-calculator?gross=${gross}`}
          className="inline-flex min-h-11 items-center text-base font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open in calculator
        </Link>
      </p>
      <AdSlot placement="calculator" />
      <section aria-labelledby="faq-heading" className="max-w-prose space-y-4">
        <h2 id="faq-heading" className="font-display text-2xl">
          Common questions
        </h2>
        {faqs.map((f) => (
          <div key={f.question}>
            <h3 className="font-medium">{f.question}</h3>
            <p className="text-muted">{f.answer}</p>
          </div>
        ))}
      </section>
      <ToolLinks country={country} />
      {jsonLd.map((block) => (
        <script
          key={block["@type"]}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdString(block) }}
        />
      ))}
    </>
  );
}
