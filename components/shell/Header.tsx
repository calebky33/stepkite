import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CountrySwitcher } from "./CountrySwitcher";

export function Header() {
  return (
    <header className="border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
      <a
        href="#main"
        className="sr-only rounded-input bg-primary px-4 py-3 text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-4 md:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Logo className="h-8 w-auto" />
        </Link>
        <CountrySwitcher />
      </div>
    </header>
  );
}
