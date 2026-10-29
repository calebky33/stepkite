"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { COUNTRY_INFO, isCountry, type CountryCode } from "@/lib/countries";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm text-ink-muted underline-offset-4 hover:text-ink-fg hover:underline";

type FooterLink = { href: string; label: string };

function countryFrom(pathname: string): CountryCode {
  const first = pathname.split("/")[1] ?? "";
  return isCountry(first) ? first : "uk";
}

function Column({ title, links, label }: { title: string; links: FooterLink[]; label?: string }) {
  return (
    <nav aria-label={label ?? title}>
      <h2 className="text-sm font-semibold text-ink-fg">{title}</h2>
      <ul>
        {links.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={LINK_CLASS}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The three country-aware footer columns. Kept small and separate from the static footer. */
export function FooterNav({ children }: { children?: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const country = countryFrom(pathname);
  const info = COUNTRY_INFO[country];

  const tools: FooterLink[] = [
    { href: `/${country}/salary-calculator`, label: "Take-home calculator" },
    { href: `/${country}/cv`, label: info.cvName === "résumé" ? "Résumé builder" : "CV builder" },
    { href: `/${country}/compare/offers`, label: "Offer comparison" },
    { href: `/${country}`, label: "All tools" },
  ];
  const explore: FooterLink[] = [
    { href: `/${country}/guides`, label: "Career guides" },
    { href: "/pricing", label: "Pricing" },
    { href: "#product-updates", label: "Product updates" },
  ];
  const company: FooterLink[] = [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy policy" },
    { href: "/terms", label: "Terms of use" },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 md:grid-cols-4">
      <Column title="Tools" links={tools} />
      <Column title="Explore" links={explore} />
      <Column title="Stepkite" label="Company" links={company} />
      {children}
    </div>
  );
}
