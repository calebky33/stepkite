import Link from "next/link";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { NewsletterSignup } from "./NewsletterSignup";
import { ThemeToggle } from "./ThemeToggle";

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
    <footer className="mt-16 mb-[var(--consent-h,0px)] border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-4 py-10 md:grid-cols-3 md:px-6">
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
      <section
        aria-labelledby="footer-news"
        className="mx-auto flex max-w-[1120px] flex-col gap-3 px-4 pb-8 md:px-6"
      >
        <h2 id="footer-news" className="text-sm font-semibold">
          Hear when a new tool opens
        </h2>
        <NewsletterSignup />
      </section>
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 md:flex-row md:items-end md:justify-between md:px-6">
        <p className="max-w-prose text-sm text-muted">
          Stepkite gives estimates, not tax advice. Your payslip may differ.
        </p>
        <div className="w-full max-w-60 shrink-0">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
