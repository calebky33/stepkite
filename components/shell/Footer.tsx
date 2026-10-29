import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { FooterNav } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { ThemeToggle } from "./ThemeToggle";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-base text-bg/75 underline-offset-2 hover:text-bg hover:underline";

export function Footer() {
  return (
    <footer className="mt-16 mb-[var(--consent-h,0px)] bg-text pb-[max(1.5rem,env(safe-area-inset-bottom))] text-bg">
      <div className="mx-auto max-w-[1120px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 border-b border-bg/20 pb-8">
          <Link
            href="/"
            className="inline-flex min-h-11 self-start rounded-input bg-surface px-3 py-2"
          >
            <Logo className="h-7 w-auto" />
          </Link>
          <p className="max-w-md text-sm text-bg/75">
            Pay and career tools for the UK, US and India. Free to use. Your CV and job list stay on
            your device.
          </p>
        </div>

        <FooterNav>
          <nav aria-label="Countries">
            <h2 className="text-sm font-semibold text-bg">Countries</h2>
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
        </FooterNav>

        <div className="grid gap-6 rounded-card bg-surface p-4 text-text md:grid-cols-[1fr_auto] md:p-6">
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

        <div className="mt-6 flex flex-col gap-2 border-t border-bg/20 pt-6 text-sm text-bg/75 sm:flex-row sm:items-center sm:justify-between">
          <p>2026 Stepkite. All rights reserved.</p>
          <nav aria-label="Legal">
            <h2 className="sr-only">Legal</h2>
            <Link
              href="/cookies"
              className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-bg"
            >
              Cookies
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
