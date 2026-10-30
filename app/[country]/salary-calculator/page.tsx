import type { Metadata } from "next";
import Link from "next/link";
import { AdSlot } from "@/components/shell/AdSlot";
import { PayCalculator } from "@/components/tools/PayCalculator/PayCalculator";
import { ToolLinks } from "@/components/tools/ToolLinks";
import { COUNTRY_INFO } from "@/lib/countries";
import { SALARY_CONTENT } from "@/lib/content/salaryCalculator";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { INDEXABLE_PATHS, SITE_URL, stubMetadata } from "@/lib/seo";
import { getRates } from "@/lib/tax";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await requireCountry(params);
  const canonical = `${SITE_URL}/${country}/salary-calculator`;
  const content = SALARY_CONTENT[country];
  if (!content) {
    const term = COUNTRY_INFO[country].takeHomeTerm;
    return stubMetadata({
      title: `${COUNTRY_INFO[country].name} salary calculator`,
      description: `Work out your ${term} in ${COUNTRY_INFO[country].name}.`,
      alternates: { canonical },
    });
  }
  const meta: Metadata = {
    title: content.title,
    description: content.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: content.title,
      description: content.description,
      url: canonical,
    },
  };
  // Stay out of search results until the rates have been checked against the official source.
  // Index only when the rates are loaded and the path is on the reviewed list in lib/seo.ts.
  const indexable =
    getRates(country).loaded && INDEXABLE_PATHS.includes(`/${country}/salary-calculator`);
  return indexable ? meta : stubMetadata(meta);
}

function jsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function SalaryCalculatorPage({ params }: Props) {
  const country = await requireCountry(params);
  const info = COUNTRY_INFO[country];
  const content = SALARY_CONTENT[country];

  if (!content) {
    return (
      <>
        <h1 className="font-display text-4xl">Salary calculator for {info.name}</h1>
        <PayCalculator country={country} />
        <AdSlot placement="calculator" />
        <ToolLinks country={country} />
      </>
    );
  }

  const url = `${SITE_URL}/${country}/salary-calculator`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: content.h1,
      description: content.description,
      url,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any",
      inLanguage: info.locale,
      offers: { "@type": "Offer", price: "0", priceCurrency: COUNTRY_INFO[country].currency },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: content.faqs.map((f) => ({
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
        { "@type": "ListItem", position: 3, name: content.h1, item: url },
      ],
    },
  ];

  return (
    <>
      <h1 className="font-display text-4xl">{content.h1}</h1>
      <p className="max-w-prose text-muted">{content.intro}</p>
      <PayCalculator country={country} />
      <p className="max-w-prose text-sm text-muted">
        Applying for jobs?{" "}
        <Link href={`/${country}/cv`}>Build your {COUNTRY_INFO[country].cvName}</Link>.
      </p>
      <AdSlot placement="calculator" />
      <section aria-labelledby="faq-heading" className="max-w-prose space-y-4">
        <h2 id="faq-heading" className="font-display text-2xl">
          Common questions
        </h2>
        {content.faqs.map((f) => (
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
