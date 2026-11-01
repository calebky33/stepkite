# MONETIZATION.md

How Stepkite earns. Pairs with docs/RULES.md pricing section. Nothing here contradicts RULES.md; it describes the shape.

## Flow

```
visit  →  sign up or sign in   (gate, cannot be skipped)
      →  build and preview     (free, unlimited edits, autosaved every change)
      →  click Export / Download / Finish / pick a premium template
      →  Stripe Checkout
            └─ trial path:   $1 for 7 days, converts to monthly or yearly
            └─ one-off path: $39 yearly or $149 lifetime
      →  webhook writes entitlement in Supabase
      →  server renders unwatermarked PDF or Word
```

Free export: a watermarked PDF rendered in the browser from one ATS-safe template. Paid export: server-rendered PDF or Word from any template.

## Supabase schema (owner creates the project)

```
users               (one row per auth user)
  id uuid pk  (= auth.uid())
  email text unique
  created_at timestamptz default now()

plans               (one source of truth for prices)
  code text pk      ("free"|"trial"|"monthly"|"yearly"|"lifetime")
  stripe_product_id text
  stripe_price_id text
  amount_cents int
  currency text        ("USD"|"GBP"|"INR")
  interval text null   ("day"|"month"|"year"|null for lifetime)
  interval_count int null
  active bool
  notes text

entitlements        (one row per user, server-side truth)
  user_id uuid pk references users(id) on delete cascade
  plan_code text references plans(code)
  status text         ("none"|"trialing"|"active"|"canceled"|"past_due"|"revoked")
  current_period_end timestamptz null
  cancel_at timestamptz null       (when access revokes)
  stripe_customer_id text
  stripe_subscription_id text null
  updated_at timestamptz default now()

payments            (audit, one row per Stripe event we accepted)
  id uuid pk default gen_random_uuid()
  user_id uuid references users(id)
  event_id text unique    (Stripe event.id, idempotency)
  type text               (invoice.paid, charge.succeeded, etc.)
  amount_cents int
  currency text
  occurred_at timestamptz
  raw jsonb
```

Row-level security: a user reads only their own row in `users` and `entitlements`; writes only through server routes. `plans` is readable by all. `payments` is readable only by the owner through a service role.

## Stripe products (owner creates in dashboard, prices land in `plans` table)

- `prod_trial` → `price_trial` $1.00 USD once, with 7-day free then convert
- `prod_monthly` → `price_monthly` $9.99 USD / month
- `prod_yearly` → `price_yearly` $39.00 USD / year
- `prod_lifetime` → `price_lifetime` $149.00 USD one-time

Localized prices land before each market opens (GBP in UK, INR in India). Stripe Tax is on for every price.

Stripe Radar: enable. Block disposable email domains (list stays server-side in `lib/paywall/blocklist.ts`).

## Routes we add

- `POST /api/auth/signup` email+password sign-up (handled by Supabase JS; this doc is for reference)
- `POST /api/auth/signin`
- `GET  /api/auth/callback` OAuth return (Google, LinkedIn)
- `POST /api/paywall/checkout` creates a Stripe Checkout session; body `{plan: "trial"|"monthly"|"yearly"|"lifetime"}`
- `POST /api/paywall/portal` creates a Stripe Billing Portal session for the signed-in user
- `POST /api/stripe/webhook` the only writer to `entitlements` and `payments`
- `GET  /api/export/pdf` entitlement-gated; checks `status in ("trialing","active") OR plan_code = "lifetime"`
- `GET  /api/export/docx` same gate

Client never says "I paid". Server reads Supabase. Supabase is written by the webhook only.

## Pages we add or refresh

- `/sign-in`, `/sign-up` replace stubs. Auth-first gate on `/{country}/cv` and other paid surfaces.
- `/pricing` the 4 cards (Free, Monthly, Yearly, Lifetime) with next-renewal copy. Signed-in users see their current plan, next charge amount, next charge date, and a Cancel button at the top of the page.
- `/account` same current-plan panel, plus Email, Password, Linked accounts, Delete my account.

## Webhook contract

Idempotent. The route stores `event.id` in `payments`; a second delivery of the same id is accepted and dropped.

| Stripe event                  | Entitlement change                                                          |
| ----------------------------- | --------------------------------------------------------------------------- |
| customer.created              | insert `users` row if missing, store `stripe_customer_id` in `entitlements` |
| checkout.session.completed    | mark entitlement status based on the plan                                   |
| customer.subscription.updated | update `status`, `current_period_end`, `cancel_at`                          |
| customer.subscription.deleted | status = `"canceled"`, cancel_at = now                                      |
| invoice.paid                  | append to `payments`, extend `current_period_end`                           |
| invoice.payment_failed        | status = `"past_due"`                                                       |
| charge.refunded               | status = `"revoked"` when full refund                                       |

Reminders ride on top:

- Trial-conversion reminder email at `current_period_end - 48h`.
- Annual renewal reminder at `current_period_end - 48h`.
- Monthly: both an email (opt-out, on by default) and an in-app banner from `current_period_end - 48h` to `current_period_end`.

## Trust rules in code

- Checkout session includes `subscription_data.description = "Today $1.00. Then $9.99 / month starting <date>. Cancel anytime."` and the trial end date is confirmed in the success page.
- `/api/paywall/portal` link is one click from the account page.
- Receipts: Stripe sends them. We also store the audit row in `payments`.
- Refunds: `/api/paywall/refund` opens a mailto when a user requests one within the money-back window; the owner approves and refunds in Stripe.

## Not in this build (defer to a future session)

- Localized prices (GBP, INR) land before each market opens.
- Server-rendered PDF via puppeteer-core on a Worker (free is browser-side; paid lands server-side when the Worker + puppeteer path is proven).
- Team or multi-seat.
- Referral or affiliate program.

## Owner steps before the first build session

1. Create a Supabase project; copy `anon` key and service role key to secrets.
2. Create Stripe products and prices listed above; copy ids into the `plans` table.
3. Add Google and LinkedIn OAuth apps to Supabase Auth settings.
4. Set webhook endpoint `/api/stripe/webhook` and copy signing secret.
5. Set GitHub Actions secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_PUBLIC_KEY`. Set Worker secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

The build session cannot start until step 1 and step 2 are complete.
