import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { Flag } from "./Flag";
import { FooterNav } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { SocialIcons } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm text-ink-muted underline-offset-4 hover:text-ink-fg hover:underline";

export function Footer() {
  return (
    <footer className="on-ink mt-12 mb-[var(--consent-h,0px)] bg-ink pb-[max(1rem,env(safe-area-inset-bottom))] text-ink-fg">
      <div className="mx-auto max-w-[1120px] px-4 pt-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-ink-line pb-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/" className="inline-flex min-h-11 items-center text-ink-fg">
              <Logo className="h-6 w-auto" />
            </Link>
            <p className="max-w-md text-sm text-ink-muted">
              Pay and career tools for the UK, US and India. Free to use. Your CV and job list stay
              on your device.
            </p>
          </div>
          <SocialIcons />
        </div>

        <FooterNav>
          <nav aria-label="Countries">
            <h2 className="text-sm font-semibold text-ink-fg">Supported countries</h2>
            <ul>
              {COUNTRIES.map((code) => (
                <li key={code}>
                  <Link href={`/${code}`} className={`${LINK_CLASS} gap-2`}>
                    <Flag code={code} />
                    {COUNTRY_INFO[code].name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </FooterNav>

        <section
          id="product-updates"
          aria-labelledby="footer-news"
          className="on-light scroll-mt-[calc(var(--header-h)+1rem)] grid gap-2 rounded-card bg-surface p-3 text-text md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start md:gap-6"
        >
          <div>
            <h2 id="footer-news" className="text-sm font-semibold">
              Product updates
            </h2>
            <p className="text-sm text-muted">
              Email sign-up is not connected yet. The form will tell you if you try.
            </p>
          </div>
          <NewsletterSignup />
        </section>

        <div className="mt-4 flex flex-col gap-1 border-t border-ink-line pt-3 text-sm text-ink-muted md:flex-row md:items-center md:justify-between md:gap-4">
          <p>Stepkite gives estimates, not tax advice. Your actual pay may differ.</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <nav aria-label="Legal">
              <h2 className="sr-only">Legal</h2>
              <Link
                href="/cookies"
                className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink-fg hover:underline"
              >
                Cookies
              </Link>
            </nav>
            <ThemeToggle />
          </div>
          <div className="flex flex-col gap-0.5 md:items-end">
            <p>2026 Stepkite. All rights reserved.</p>
            <p>Career tools, designed around you.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
