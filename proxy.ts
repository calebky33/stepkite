import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { buildCsp, cspHeaderName } from "@/lib/security/csp";

/**
 * Per-request nonce CSP and sign-in gate.
 *
 * The CSP work mints a one-off nonce for Next's own scripts (other headers live in
 * next.config.ts). On top of that, pages that need a signed in user (CV builder tracker, the
 * account hub, the billing hub) redirect to the sign-up page when there is no session, keeping
 * the original path in `next` so the caller lands back where they started. See
 * docs/MONETIZATION.md (Gated pages).
 */

const GATED_PATH_PATTERNS: readonly RegExp[] = [
  /^\/(uk|us|in)\/tracker(?:\/|$)/,
  /^\/account(?:\/|$)/,
  /^\/billing(?:\/|$)/,
];

/** Pure, testable gate decision. True when the visitor must be redirected to sign up. */
export function shouldRedirect(pathname: string, hasSession: boolean): boolean {
  if (hasSession) return false;
  return GATED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);
  const name = cspHeaderName();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(name, csp);

  const url = new URL(request.url);
  const user = await getSession(request);
  if (shouldRedirect(url.pathname, user !== null)) {
    const next = `${url.pathname}${url.search}`;
    const target = new URL(`/sign-up?next=${encodeURIComponent(next)}`, url.origin);
    const redirect = NextResponse.redirect(target);
    redirect.headers.set(name, csp);
    return redirect;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(name, csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static/|_next/image/|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
