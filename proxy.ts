import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { COUNTRIES } from "@/lib/countries";
import { USER_COOKIE } from "@/lib/cv/userCookie";
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

const WWW_HOST = "www.stepkite.app";
const BARE_HOST = "stepkite.app";

const GATED_PATH_PATTERNS: readonly RegExp[] = [
  // Every market in the registry, not only the three tax markets.
  new RegExp(`^/(${COUNTRIES.join("|")})/tracker(?:/|$)`),
  /^\/account(?:\/|$)/,
  /^\/billing(?:\/|$)/,
];

const AUTH_PATH_PATTERNS: readonly RegExp[] = [/^\/sign-in(?:\/|$)/, /^\/sign-up(?:\/|$)/];

/** Pure, testable gate decision. True when the visitor must be redirected to sign up. */
export function shouldRedirect(pathname: string, hasSession: boolean): boolean {
  if (hasSession) return false;
  return GATED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

/** Signed-in visitors on /sign-in or /sign-up belong on the account page, not the login form. */
export function shouldRedirectWhenSignedIn(pathname: string, hasSession: boolean): boolean {
  if (!hasSession) return false;
  return AUTH_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
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
  // One address for the site: www.stepkite.app goes to stepkite.app, keeping the path and query.
  // An exact match, so no other host can be bounced anywhere.
  if (url.hostname === WWW_HOST) {
    const target = new URL(request.url);
    target.hostname = BARE_HOST;
    return NextResponse.redirect(target, 308);
  }
  const user = await getSession(request);
  // Carry the signed-in boolean to page renders so the root layout reads it
  // from headers() instead of calling getSession a second time.
  requestHeaders.set("x-stepkite-signed-in", user !== null ? "1" : "0");
  // The display name for the header. Percent encoded so any character is safe in a header.
  requestHeaders.delete("x-stepkite-user-name");
  if (user?.name) requestHeaders.set("x-stepkite-user-name", encodeURIComponent(user.name));
  if (shouldRedirect(url.pathname, user !== null)) {
    const next = `${url.pathname}${url.search}`;
    const target = new URL(`/sign-up?next=${encodeURIComponent(next)}`, url.origin);
    const redirect = NextResponse.redirect(target);
    redirect.headers.set(name, csp);
    syncUserCookie(request, redirect, user !== null);
    return redirect;
  }
  if (shouldRedirectWhenSignedIn(url.pathname, user !== null)) {
    // Build the target in two steps so we can reject anything that resolves off-origin.
    // Backslashes are normalised to slashes by WHATWG, so "/\\evil.com" would otherwise escape.
    const nextParam = url.searchParams.get("next");
    const hasBackslash = nextParam?.includes("\\") ?? false;
    const target = (() => {
      if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//") || hasBackslash) {
        return new URL("/", url.origin);
      }
      const candidate = new URL(nextParam, url.origin);
      return candidate.origin === url.origin ? candidate : new URL("/", url.origin);
    })();
    const redirect = NextResponse.redirect(target);
    redirect.headers.set(name, csp);
    syncUserCookie(request, redirect, user !== null);
    return redirect;
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(name, csp);
  syncUserCookie(request, response, user !== null);
  return response;
}

/**
 * Keeps the `sk_user` hint cookie in step with the real session. The CV page is client side and
 * cannot see the Supabase cookies, so it reads this to choose between the sandbox draft and the
 * signed in builder. It is a UI hint only: every protected read and write checks the session on
 * the server, so a forged cookie unlocks nothing.
 */
function syncUserCookie(request: NextRequest, response: NextResponse, signedIn: boolean): void {
  const has = request.cookies.has(USER_COOKIE);
  if (signedIn && !has) {
    response.cookies.set(USER_COOKIE, "1", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  } else if (!signedIn && has) {
    response.cookies.delete(USER_COOKIE);
  }
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
