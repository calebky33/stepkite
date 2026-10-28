import Link from "next/link";
import type { ReactNode } from "react";
import { COUNTRY_INFO } from "@/lib/countries";
import { countryParams, requireCountry, type CountryParams } from "@/lib/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return countryParams();
}

export default async function CountryLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<CountryParams>;
}) {
  const country = await requireCountry(params);
  const info = COUNTRY_INFO[country];
  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 pb-16 pt-4 md:px-6">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-input px-2 text-primary underline-offset-4 hover:underline"
            >
              Stepkite
            </Link>
          </li>
          <li aria-current="page" className="px-2">
            {info.name}
          </li>
        </ol>
      </nav>
      <main id="main" className="flex min-w-0 flex-col gap-8">
        {children}
      </main>
    </div>
  );
}
