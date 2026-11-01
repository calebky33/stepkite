/**
 * Disposable email domains. Used by sign-up and the trial route to brake abuse: a disposable
 * address lets one person claim many free trials. The list is server side only and never
 * presented to the user. See docs/MONETIZATION.md (Stripe Radar: enable).
 *
 * This is not a complete catalogue (there are thousands of these services). It covers the most
 * common ones. We can add more without a code change by moving the list to a Supabase table
 * later.
 */
const DISPOSABLE_DOMAINS: readonly string[] = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "10minutemail.com",
  "10minutemail.net",
  "trashmail.com",
  "trashmail.net",
  "maildrop.cc",
  "dispostable.com",
  "yopmail.com",
  "yopmail.net",
  "yopmail.fr",
  "getnada.com",
  "nada.email",
  "throwaway.email",
  "mohmal.com",
  "inboxbear.com",
  "fakeinbox.com",
  "mintemail.com",
  "mailnesia.com",
  "mytemp.email",
  "mailcatch.com",
  "spam4.me",
  "spambog.com",
  "spambox.us",
  "mohmal.in",
  "tempinbox.com",
  "incognitomail.com",
  "mailforspam.com",
  "mail-temp.com",
  "mailtemp.net",
  "burnermail.io",
  "33mail.com",
  "fakemail.net",
  "throwawaymail.com",
] as const;

const DISPOSABLE_SET: ReadonlySet<string> = new Set(DISPOSABLE_DOMAINS);

/**
 * True when the email's domain (or any of its parent domains) is in the disposable list.
 * Lower cases the input and matches the full domain plus every suffix: "foo.mailinator.com"
 * resolves through "mailinator.com". A malformed email (no `@`, or empty domain) returns false
 * so sign-up validation can emit its own targeted error.
 */
export function isDisposable(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return false;
  const domain = email
    .slice(at + 1)
    .toLowerCase()
    .trim();
  if (!domain) return false;
  if (DISPOSABLE_SET.has(domain)) return true;
  // Subdomain check: inbox.mailinator.com → mailinator.com
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i += 1) {
    if (DISPOSABLE_SET.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/** For tests and debugging. Never expose this to the client. */
export const DISPOSABLE_DOMAIN_COUNT = DISPOSABLE_DOMAINS.length;
