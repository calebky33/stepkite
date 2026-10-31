/**
 * Content-Security-Policy for pages. Hosts come from the code:
 * - connect-src https://*.supabase.co: the browser Supabase client (lib/supabase/browser.ts).
 * - Fonts are self-hosted by next/font, images are local, and checkout is a redirect to Stripe
 *   (navigation is not limited by CSP), so no other host is allowed.
 * - style-src 'unsafe-inline': React style attributes need it. Scripts never get it.
 */
export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/**
 * Always enforced. The policy was enforced before the headers pass, so it is never weakened to
 * report-only. Loosen a directive here only after checking a preview version (docs/DEPLOY.md).
 */
export function cspHeaderName(): string {
  return "Content-Security-Policy";
}
