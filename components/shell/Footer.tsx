import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { Flag } from "./Flag";
import { FooterNav } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { SocialIcons } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-base text-ink-muted underline-offset-4 hover:text-ink-fg hover:underline";

export function Footer() {
  return (
    <footer className="on-ink mt-16 mb-[var(--consent-h,0px)] bg-ink pb-[max(1.5rem,env(safe-area-inset-bottom))] text-ink-fg">
      <div className="mx-auto max-w-[1120px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 border-b border-ink-line pb-8">
          <Link
            href="/"
            className="inline-flex min-h-11 self-start rounded-input bg-surface px-3 py-2"
          >
            <Logo className="h-7 w-auto" />
          </Link>
          <p className="max-w-md text-sm text-ink-muted">
            Pay and career tools for the UK, US and India. Free to use. Your CV and job list stay on
            your device.
          </p>
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

        <div className="on-light grid gap-6 rounded-card bg-surface p-4 text-text md:grid-cols-[1fr_auto] md:p-6">
          <section
            id="product-updates"
            aria-labelledby="footer-news"
            className="scroll-mt-[calc(var(--header-h)+1rem)] flex flex-col gap-3"
          >
            <h2 id="footer-news" className="text-sm font-semibold">
              Product updates
            </h2>
            <p className="max-w-md text-sm text-muted">
              Email sign-up is not connected yet. The form will tell you if you try.
            </p>
            <NewsletterSignup />
          </section>
          <div className="flex w-full max-w-60 shrink-0 flex-col gap-3">
            <ThemeToggle />
            <p className="text-sm text-muted">
              Stepkite gives estimates, not tax advice. Your actual pay may differ.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-ink-line pt-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Stepkite. All rights reserved.</p>
          <nav aria-label="Legal">
            <h2 className="sr-only">Legal</h2>
            <Link
              href="/cookies"
              className="inline-flex min-h-11 items-center underline-offset-4 hover:text-ink-fg hover:underline"
            >
              Cookies
            </Link>
          </nav>
          <p className="sm:text-right">Career tools, designed around you.</p>
        </div>
      </div>
    </footer>
  );
}
