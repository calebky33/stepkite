import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { FooterNav } from "./FooterNav";
import { NewsletterSignup } from "./NewsletterSignup";
import { ThemeToggle } from "./ThemeToggle";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-base text-muted underline-offset-2 hover:text-text hover:underline";

export function Footer() {
  return (
    <footer className="mt-16 mb-[var(--consent-h,0px)] border-t border-border pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-[1120px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 border-b border-border pb-8">
          <Link href="/" className="inline-flex min-h-11 self-start">
            <Logo className="h-7 w-auto" />
          </Link>
          <p className="max-w-md text-sm text-muted">
            Pay and career tools for the UK, US and India. Free to use. Your CV and job list stay on
            your device.
          </p>
        </div>

        <FooterNav />

        <section
          id="product-updates"
          aria-labelledby="footer-news"
          className="scroll-mt-[calc(var(--header-h)+1rem)] flex flex-col gap-3 border-t border-border py-8"
        >
          <h2 id="footer-news" className="text-sm font-semibold">
            Product updates
          </h2>
          <p className="max-w-md text-sm text-muted">
            Email sign-up is not connected yet. The form will tell you if you try.
          </p>
          <NewsletterSignup />
        </section>

        <div className="flex flex-col gap-6 border-t border-border pt-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
            <nav aria-label="Countries">
              <h2 className="text-sm font-semibold">Countries</h2>
              <ul className="flex flex-wrap gap-x-4">
                {COUNTRIES.map((code) => (
                  <li key={code}>
                    <Link href={`/${code}`} className={LINK_CLASS}>
                      {COUNTRY_INFO[code].name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h2 className="text-sm font-semibold">Legal</h2>
              <ul>
                <li>
                  <Link href="/cookies" className={LINK_CLASS}>
                    Cookies
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex w-full max-w-60 shrink-0 flex-col gap-3">
            <ThemeToggle />
            <p className="text-sm text-muted">
              Stepkite gives estimates, not tax advice. Your actual pay may differ.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
