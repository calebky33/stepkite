import Link from "next/link";
import type { CountryCode } from "@/lib/countries";
import { buttonStyles } from "@/components/ui/Button";

type Props = { country: CountryCode };

/**
 * Non-dismissible sign-up prompt shown in the anonymous CV sandbox. Mounts once the visitor has
 * typed for 60 seconds or has clicked Save or Download PDF, so the moment of real value is also
 * the moment we ask them to create an account.
 *
 * See docs/MONETIZATION.md (Soft-start sandbox) and docs/RULES.md rule 16.
 */
export function SandboxBanner({ country }: Props) {
  return (
    <section
      role="region"
      aria-label="Sign up to save your draft"
      aria-live="polite"
      className="sticky top-[var(--header-h)] z-30 flex flex-col gap-3 rounded-card border border-border bg-accent-soft p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-base font-semibold text-text">
        Sign up to save and export your CV. Your draft moves to your account.
      </p>
      <Link
        href={`/sign-up?next=/${country}/cv`}
        className={buttonStyles("primary", "self-start sm:self-auto")}
      >
        Sign up
      </Link>
    </section>
  );
}
