import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { Flag } from "./Flag";
import { FooterGroup } from "./FooterGroup";
import { FooterNav } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { SocialIcons } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm text-ink-muted underline-offset-4 hover:text-ink-fg hover:underline";

export function Footer() {
  return (
    <footer className="on-ink mt-8 mb-[var(--consent-h,0px)] bg-ink pb-[max(0.5rem,env(safe-area-inset-bottom))] text-ink-fg lg:mt-12 lg:pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[1120px] px-4 pt-4 md:px-6 lg:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-ink-line pb-3 lg:gap-y-2 lg:pb-4">
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
          <FooterGroup title="Supported countries" label="Countries">
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
          </FooterGroup>
        </FooterNav>

        <section
          id="product-updates"
          aria-labelledby="footer-news"
          className="on-light scroll-mt-[calc(var(--header-h)+1rem)] grid gap-2 py-3 text-ink-fg md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-start md:gap-6 lg:rounded-card lg:bg-surface lg:p-3 lg:text-text"
        >
          <div>
            <h2 id="footer-news" className="text-sm font-semibold">
              Product updates
            </h2>
            <p className="text-sm text-ink-muted lg:text-muted">
              Email sign-up is not connected yet. The form will tell you if you try.
            </p>
          </div>
          <NewsletterSignup />
        </section>

        <div className="mt-2 flex flex-col items-center gap-0.5 border-t border-ink-line pt-2 text-center text-sm text-ink-muted md:mt-4 md:flex-row md:justify-between md:gap-4 md:pt-3 md:text-left">
          <p>Stepkite gives estimates, not tax advice. Your actual pay may differ.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-start">
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
          <div className="flex flex-col items-center gap-0.5 md:items-end">
            <p>2026 Stepkite. All rights reserved.</p>
            <p>Career tools, designed around you.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
