# ARCHITECTURE.md

Static-first. Server only for auth, sync, payments, AI.

## Layout

```
app/
  [country]/                 uk | us | in (generateStaticParams)
    salary-calculator/       SSG landing + tool
    salary/[amount]/         SSG salary-level pages (selected amounts only)
    cv/                      CV builder (client)
    tracker/                 job tracker (client)
    guides/[slug]/           MDX
  api/
    paywall/checkout/route.ts  initialize a Paystack transaction, return authorization URL
    paywall/cancel/route.ts    disable the user's Paystack subscription
    paystack/webhook/route.ts  verify signature, grant Pro
    match/route.ts           AI job-ad matching (auth + rate limit)
    og/route.tsx             share images
  sitemap.ts, robots.ts
lib/
  tax/{uk,us,in}/            pure engines + rates.<year>.ts + tests
  cv/                        schema.ts (zod), rules/<country>.ts, pdf.ts, phrases.ts
  storage/                   IndexedDB (idb-keyval) wrapper; sync adapter
  supabase/                  server + browser clients
  pro.ts                     entitlement check
components/{ui,tools}/
content/<country>/*.mdx
```

## Data

- Free users: everything in IndexedDB. No account.
- Signed-in sync: Supabase tables `profiles`, `cvs (id, user_id, data jsonb, updated_at)`, `jobs`, `entitlements (user_id, plan_code, status, current_period_end, paystack_customer_code, paystack_subscription_code)`. RLS on every table: `user_id = auth.uid()`.
- Conflict rule for sync: last-write-wins by `updated_at`, keep one previous version.

## Payments

- Provider: Paystack. USD only at launch (Paystack does not support GBP or INR).
- Lifetime: POST `/transaction/initialize` (one-time, no plan). On `charge.success`, grant lifetime entitlement. Idempotent on the Paystack event id.
- Monthly and yearly: POST `/transaction/initialize` with a `plan` code (PLN_...). Paystack bills the cadence automatically. The `subscription.create` event records the subscription code; `charge.success` extends `current_period_end`; `subscription.disable` ends access at the paid period end.
- Cancel: the Cancel plan button on `/account` calls `/api/paywall/cancel`, which fetches the subscription token and POSTs `/subscription/disable` (Paystack has no hosted customer portal). It sets `cancel_at` to the end of the paid period.
- Tax is our responsibility (Paystack does not collect), so prices are tax-inclusive outside the US. No card data touches our servers.

## AI matching

- Server route only; key in env. zod-validate input; cap job-ad and CV text length; per-user and per-IP rate limit; free = 1/month.
- Prompt returns structured JSON: requirements, which are evidenced, suggested rewording of EXISTING lines only. UI shows diffs; user accepts each.

## Hosting

Cloudflare Workers via OpenNext. Verify in week 1: SSG, route handlers, OG images, middleware. Avoid features the adapter does not support (check docs, don't assume).

## Security checklist

zod on every route input · auth + ownership check on every record · rate limits · secrets in env only · webhook signature verification · CSP headers · no PII in logs · daily DB backups.
