import { readConsentCookie } from "@/lib/consent";

/**
 * Privacy friendly event hook. No provider is wired yet, so this sends nothing.
 * Events carry a name and a few plain properties. Never salary values, CV text or emails.
 */
export type AnalyticsEvent =
  | { name: "calculator_used"; country: string }
  | { name: "cv_downloaded"; country: string }
  | { name: "pro_checkout_started"; country: string };

export function track(event: AnalyticsEvent): void {
  if (typeof document === "undefined") return;
  const consent = readConsentCookie(document.cookie);
  if (!consent?.analytics) return;
  // Provider call goes here once one is chosen.
  void event;
}
