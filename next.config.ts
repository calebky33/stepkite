import type { NextConfig } from "next";

/**
 * The Turnstile site key is public by design: it ships to every visitor's browser. The auto deploy
 * builds without the GitHub secrets, so a missing key silently turns the bot check off on the
 * client while the server still demands a token. Keep a fallback here. Rotate it together with the
 * widget (docs/OWNER-SETUP.md 3.3), or set NEXT_PUBLIC_TURNSTILE_SITEKEY in the build.
 */
const TURNSTILE_SITEKEY = "0x4AAAAAAFuKX0ye0q3FPyLZ";

/** The Content-Security-Policy header is set per request in proxy.ts, because it carries a nonce. */
const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_TURNSTILE_SITEKEY: process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || TURNSTILE_SITEKEY,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Checkout is a redirect to Paystack, so no page here needs the payment API.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cross-Origin-Resource-Policy", value: "same-origin" }],
      },
    ];
  },
};

export default nextConfig;
