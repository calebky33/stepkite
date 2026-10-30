"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/components/ui/cn";
import { COUNTRY_INFO, cvLabelTitle, isCountry, type CountryCode } from "@/lib/countries";
import { useSavedCountry } from "@/lib/countryPreference";
import { CountrySwitcher } from "./CountrySwitcher";
import { ToolsMenu } from "./ToolsMenu";

type ItemKey = "pay" | "cv" | "tools" | "pricing";

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-input px-3 text-base font-medium transition-colors duration-150 ease-[var(--ease-out)]";

function countryFrom(pathname: string, saved: CountryCode): CountryCode {
  const first = pathname.split("/")[1] ?? "";
  return isCountry(first) ? first : saved;
}

/**
 * Publish the header bar height so sticky UI can sit below it. The bar is measured on its own
 * because the mobile menu lives inside the header and would otherwise inflate the value.
 */
function publishHeight(el: HTMLElement | null): (() => void) | undefined {
  if (!el) return undefined;
  const root = document.documentElement;
  const bar = el.querySelector<HTMLElement>("[data-header-bar]");
  const set = () => {
    const style = getComputedStyle(el);
    const chrome =
      (Number.parseFloat(style.paddingTop) || 0) +
      (Number.parseFloat(style.borderBottomWidth) || 0);
    const height = (bar?.offsetHeight ?? el.offsetHeight) + chrome;
    root.style.setProperty("--header-h", `${height}px`);
  };
  set();
  const observer = new ResizeObserver(set);
  observer.observe(el);
  if (bar) observer.observe(bar);
  return () => {
    observer.disconnect();
    root.style.removeProperty("--header-h");
  };
}

function isActive(pathname: string, country: CountryCode, key: ItemKey): boolean {
  const base = `/${country}`;
  if (key === "pay") {
    return (
      pathname === `${base}/salary-calculator` ||
      pathname.startsWith(`${base}/salary/`) ||
      pathname.startsWith(`${base}/compare/`)
    );
  }
  if (key === "cv") return pathname === `${base}/cv` || pathname.startsWith(`${base}/cv/`);
  if (key === "tools") {
    return (
      pathname === base ||
      pathname.startsWith(`${base}/tracker`) ||
      pathname.startsWith(`${base}/guides`) ||
      pathname.startsWith(`${base}/match`)
    );
  }
  return pathname === "/pricing" || pathname.startsWith("/pricing/");
}

/** "page" only for the exact route; a section match is announced as "true". */
function currentFor(pathname: string, href: string, active: boolean): "page" | "true" | undefined {
  if (!active) return undefined;
  return pathname === href ? "page" : "true";
}

export function Header() {
  const pathname = usePathname() ?? "/";
  const country = countryFrom(pathname, useSavedCountry());
  const info = COUNTRY_INFO[country];
  // The menu belongs to the path it was opened on, so a route change closes it.
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const open = openedPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const items: { key: ItemKey; href: string; label: string }[] = [
    { key: "pay", href: `/${country}/salary-calculator`, label: "Pay calculator" },
    {
      key: "cv",
      href: `/${country}/cv`,
      label: `${cvLabelTitle(info.code)} builder`,
    },
    { key: "tools", href: `/${country}`, label: "Tools" },
    { key: "pricing", href: "/pricing", label: "Pricing and features" },
  ];

  const toolLinks = [
    { href: `/${country}/salary-calculator`, label: "Take-home pay calculator" },
    { href: `/${country}/cv`, label: `${cvLabelTitle(info.code)} builder` },
    { href: `/${country}/tracker`, label: "Job tracker" },
  ];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedPath(null);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // The menu button is hidden from 1024px up, so a resize must not leave the panel open.
  useEffect(() => {
    const wide = window.matchMedia?.("(min-width: 1024px)");
    if (!wide) return;
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setOpenedPath(null);
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  }, []);

  return (
    <header
      ref={publishHeight}
      className="sticky top-0 z-30 border-b border-border bg-bg pt-[env(safe-area-inset-top)]"
    >
      <a
        href="#main"
        className="sr-only rounded-input bg-primary px-4 py-3 text-primary-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-[max(1rem,env(safe-area-inset-top))] focus:z-50"
      >
        Skip to content
      </a>
      <div
        data-header-bar
        className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-2 md:px-6"
      >
        <Link href="/" className="inline-flex min-h-11 shrink-0 items-center">
          <Logo className="h-8 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = isActive(pathname, country, item.key);
            if (item.key === "tools") {
              return (
                <ToolsMenu
                  key={item.key}
                  layout="popover"
                  links={toolLinks}
                  pathname={pathname}
                  active={active}
                  className={LINK_CLASS}
                />
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={currentFor(pathname, item.href, active)}
                className={cn(
                  LINK_CLASS,
                  active
                    ? "bg-accent-soft font-semibold text-text"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <CountrySwitcher />
            <Link href={`/${country}/cv`} className={buttonStyles("primary")}>
              Build a {info.cvName}
            </Link>
          </div>
          <span className="hidden sm:block lg:hidden">
            <Link href={`/${country}/cv`} className={buttonStyles("primary")}>
              Build {info.cvName}
            </Link>
          </span>
          <IconButton
            ref={menuButtonRef}
            className="lg:hidden"
            label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpenedPath(open ? null : pathname)}
            icon={open ? <X size={20} /> : <Menu size={20} />}
          />
        </div>
      </div>

      <div
        id="site-menu"
        hidden={!open}
        className="max-h-[calc(100dvh-var(--header-h))] overflow-y-auto overscroll-contain border-t border-border pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <nav
          aria-label="Mobile"
          className="mx-auto flex max-w-[1120px] flex-col gap-1 px-4 py-4 md:px-6"
        >
          {items.map((item) => {
            const active = isActive(pathname, country, item.key);
            if (item.key === "tools") {
              return (
                <ToolsMenu
                  key={item.key}
                  layout="inline"
                  links={toolLinks}
                  pathname={pathname}
                  active={active}
                  onNavigate={() => setOpenedPath(null)}
                  className={LINK_CLASS}
                />
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={currentFor(pathname, item.href, active)}
                onClick={() => setOpenedPath(null)}
                className={cn(
                  LINK_CLASS,
                  "w-full",
                  active
                    ? "bg-accent-soft font-semibold text-text"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-2 border-t border-border pt-3">
            <CountrySwitcher layout="inline" onNavigate={() => setOpenedPath(null)} />
          </div>
          <Link
            href={`/${country}/cv`}
            onClick={() => setOpenedPath(null)}
            className={buttonStyles("primary", "mt-2 w-full")}
          >
            Build a {info.cvName}
          </Link>
        </nav>
      </div>
    </header>
  );
}
