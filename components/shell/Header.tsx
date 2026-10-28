import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CountrySwitcher } from "./CountrySwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-border bg-bg pt-[env(safe-area-inset-top)]">
      <a
        href="#main"
        className="sr-only rounded-input bg-primary px-4 py-3 text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-end justify-between gap-x-6 gap-y-3 px-4 py-3 md:px-6">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <Logo className="h-8 w-auto" />
        </Link>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <CountrySwitcher />
          <div className="w-60">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
