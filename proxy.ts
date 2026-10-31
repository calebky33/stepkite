import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildCsp, cspHeaderName } from "@/lib/security/csp";

/**
 * Per-request nonce CSP. Next reads the nonce from the CSP request header while rendering and
 * applies it to its own scripts, so pages render per request. Other security headers live in
 * next.config.ts. The policy is enforced in every environment (see docs/DEPLOY.md).
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);
  const name = cspHeaderName();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(name, csp);

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
