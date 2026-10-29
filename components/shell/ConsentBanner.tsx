"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { DECLINED, needsConsentBanner } from "@/lib/consent";
import { saveConsent, subscribeToConsent, useConsent } from "./consentStore";

/**
 * A region code good enough to decide whether to ask. The layout is static, so this
 * runs in the browser: the route country first, then the time zone.
 */
function guessRegion(pathname: string | null): string | null {
  const first = pathname?.split("/")[1];
  if (first === "uk") return "GB";
  let zone = "";
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    return null;
  }
  if (!zone) return null;
  // Any region on the consent list works as the answer. GB stands for all of them.
  if (zone.startsWith("Europe/") || zone === "Atlantic/Reykjavik") return "GB";
  return "OUTSIDE";
}

/**
 * Shares the banner height as --consent-h so other fixed or sticky bars (pay bar, undo bar, footer)
 * sit above it and nothing is covered. The cleanup removes the variable when the banner goes.
 */
function publishHeight(el: HTMLElement | null): (() => void) | undefined {
  if (!el) return undefined;
  const root = document.documentElement;
  const set = () => root.style.setProperty("--consent-h", `${el.offsetHeight}px`);
  set();
  const observer = new ResizeObserver(set);
  observer.observe(el);
  return () => {
    observer.disconnect();
    root.style.removeProperty("--consent-h");
  };
}

export function ConsentBanner() {
  const pathname = usePathname();
  const stored = useConsent();
  const [answered, setAnswered] = useState(false);
  // False on the server and during hydration, then the real answer in the browser.
  const needed = useSyncExternalStore(
    subscribeToConsent,
    () => needsConsentBanner(guessRegion(pathname)),
    () => false,
  );

  if (!needed || stored || answered) return null;

  const choose = (analytics: boolean) => {
    saveConsent(analytics ? { analytics: true, ads: true } : DECLINED);
    setAnswered(true);
  };

  return (
    <section
      ref={publishHeight}
      aria-label="Cookie choice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 pt-4 shadow-pop pb-[max(1rem,env(safe-area-inset-bottom))] md:px-6"
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="max-w-prose text-base">
          Can we use optional cookies for page statistics and ads? Saying no is fine and every tool
          still works. We never record the salary you type.{" "}
          <Link href="/cookies" className="text-primary underline underline-offset-2">
            Read about cookies
          </Link>
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 md:flex-none" onClick={() => choose(false)}>
            Decline
          </Button>
          <Button variant="secondary" className="flex-1 md:flex-none" onClick={() => choose(true)}>
            Accept
          </Button>
        </div>
      </div>
    </section>
  );
}
