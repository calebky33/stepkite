/**
 * CV link URLs are free text. Anything that turns one into an href (a template, the PDF) must go through
 * this, so a javascript: or data: URL can never become a clickable link.
 */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    // Not a valid absolute URL, so it is shown as text and never linked.
    return null;
  }
}
