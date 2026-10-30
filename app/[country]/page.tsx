import type { Metadata } from "next";
import Link from "next/link";
import { COUNTRY_INFO, formatMoney, type CountryCode } from "@/lib/countries";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";
import { SITE_URL, stubMetadata } from "@/lib/seo";

type Props = { params: Promise<CountryParams> };

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const country = await requireCountry(params);
  return stubMetadata({
    title: `Pay and career tools for ${COUNTRY_INFO[country].name}`,
    description: `Pay tools, a ${COUNTRY_INFO[country].cvName} builder and a job tracker for ${COUNTRY_INFO[country].name}.`,
    alternates: { canonical: `${SITE_URL}/${country}` },
  });
}

type HubLink = { href: string; label: string; note?: string };
type HubGroup = { heading: string; links: HubLink[] };

function groupsFor(country: CountryCode): HubGroup[] {
  const info = COUNTRY_INFO[country];
  const base = `/${country}`;
  const pay: HubLink[] = [{ href: `${base}/compare/offers`, label: "Compare two job offers" }];
  if (country === "in") {
    pay.push({ href: `${base}/compare/regime`, label: "Old or new tax regime" });
  }
  return [
    { heading: "Pay", links: pay },
    {
      heading: "Common salaries",
      links: info.salaryLevels.map((amount) => ({
        href: `${base}/salary/${amount}`,
        label: `${info.takeHomeTerm.charAt(0).toUpperCase()}${info.takeHomeTerm.slice(1)} on ${formatMoney(amount, country)}`,
      })),
    },
    {
      heading: "Job search",
      links: [
        { href: `${base}/cv`, label: `Build your ${info.cvName}` },
        { href: `${base}/tracker`, label: "Track your applications" },
        {
          href: `${base}/match`,
          label: `Match your ${info.cvName} to a job ad`,
          note: "Not available yet",
        },
        { href: `${base}/guides`, label: "Guides" },
      ],
    },
  ];
}

export default async function CountryHubPage({ params }: Props) {
  const country = await requireCountry(params);
  const info = COUNTRY_INFO[country];
  return (
    <>
      <h1 className="font-display text-[28px] leading-tight md:text-4xl [overflow-wrap:anywhere]">
        Tools for {info.name}
      </h1>
      <p className="max-w-prose text-lg text-muted">
        Work out your {info.takeHomeTerm}, build a {info.cvName} that fits {info.name}, and keep
        track of the jobs you apply for. Your {info.cvName} and your jobs stay on this device.
      </p>
      <Link
        href={`/${country}/salary-calculator`}
        className="inline-flex min-h-11 items-center self-start rounded-input bg-primary px-4 py-2 text-base font-semibold text-primary-fg transition-[transform,scale,translate,opacity] duration-150 ease-[var(--ease-out)] hover:opacity-90 active:scale-[0.97]"
      >
        Open the salary calculator
      </Link>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
        {groupsFor(country).map((group) => {
          const lead = group.heading === "Common salaries";
          return (
            <section
              key={group.heading}
              aria-labelledby={`hub-${group.heading}`.replace(/\s/g, "-")}
              className={
                lead
                  ? "rounded-card border border-border bg-surface p-6 shadow-card md:p-8 lg:col-start-1 lg:row-span-2 lg:row-start-1"
                  : "rounded-card border border-border bg-surface-2 p-6 lg:col-start-2"
              }
            >
              <h2
                id={`hub-${group.heading}`.replace(/\s/g, "-")}
                className={
                  lead
                    ? "mb-4 font-display text-[28px] leading-tight"
                    : "mb-2 text-lg font-semibold"
                }
              >
                {group.heading}
              </h2>
              <ul>
                {group.links.map((link) => (
                  <li
                    key={link.href}
                    className={lead ? "border-t border-border first:border-t-0" : undefined}
                  >
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 flex-wrap items-center gap-x-2 text-base font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {link.label}
                      {link.note ? (
                        <span className="text-sm font-normal text-muted no-underline">
                          {link.note}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
