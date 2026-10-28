import Link from "next/link";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-base text-muted underline-offset-2 hover:text-text hover:underline";

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
] as const;

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-8 md:grid-cols-3 md:px-6">
        <nav aria-label="Countries">
          <h2 className="text-sm font-semibold">Countries</h2>
          <ul>
            {COUNTRIES.map((code) => (
              <li key={code}>
                <Link href={`/${code}`} className={LINK_CLASS}>
                  {COUNTRY_INFO[code].name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Company">
          <h2 className="text-sm font-semibold">Stepkite</h2>
          <ul>
            {COMPANY.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK_CLASS}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Legal">
          <h2 className="text-sm font-semibold">Legal</h2>
          <ul>
            {LEGAL.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={LINK_CLASS}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="mx-auto max-w-[1120px] px-4 text-sm text-muted md:px-6">
        Stepkite gives estimates, not tax advice. Your payslip may differ.
      </p>
    </footer>
  );
}
