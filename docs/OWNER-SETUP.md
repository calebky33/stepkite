# OWNER-SETUP.md

Walkthrough for the owner to connect Supabase, Stripe and the three Cloudflare dashboard toggles. Nothing in the code reads a secret you type here. Store every secret in the service's own dashboard (Supabase, Stripe, Cloudflare Workers), or as a GitHub Actions repository secret for build-time variables.

Takes about one hour the first time.

## 1. Supabase (30 min)

1.1 Create a project at <https://supabase.com/dashboard>. Pick a region close to Cloudflare's primary pop for your target market (London for UK, Virginia for US, Mumbai for India).

1.2 From the project's Settings → API, copy:

- `Project URL` → set in GitHub Actions secrets as `SUPABASE_URL`.
- `anon` public key → set in GitHub Actions secrets as `SUPABASE_ANON_KEY`.
- `service_role` secret key → set as a Worker secret:
  ```
  pnpm exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name stepkite
  ```

1.3 In Settings → Auth → Providers, enable Google and LinkedIn:

- Create a Google OAuth app at <https://console.cloud.google.com/apis/credentials>. Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Create a LinkedIn OAuth app at <https://www.linkedin.com/developers/apps>. Same redirect pattern.
- Paste the two client ids and secrets into Supabase.

1.4 Open the SQL editor and run the schema in `docs/MONETIZATION.md` (the Supabase schema block). Row-level security is on by default; the schema includes the policies.

## 2. Stripe (20 min)

2.1 Create a Stripe account at <https://dashboard.stripe.com>. Fill in the business profile and bank details. Turn on Stripe Tax in Settings → Tax.

2.2 In Products → Add product, create four products with these exact names and prices (prices in USD):

- `Stepkite Monthly` → recurring, $9.99 / month.
- `Stepkite Yearly` → recurring, $39 / year.
- `Stepkite Lifetime` → one-time, $149.
- `Stepkite Trial` → recurring, $0 / 7 days, with a 7-day free trial.

2.3 Copy each price's `price_...` id. In the Supabase SQL editor, insert them into `plans`:

```sql
insert into plans (code, stripe_product_id, stripe_price_id, amount_cents, currency, interval, interval_count, active)
values
  ('monthly',  'prod_...', 'price_...',  999, 'USD', 'month', 1, true),
  ('yearly',   'prod_...', 'price_...', 3900, 'USD', 'year',  1, true),
  ('lifetime', 'prod_...', 'price_...',14900, 'USD', null,    null, true);
```

2.4 Developers → API keys:

- Publishable key → GitHub Actions secret `STRIPE_PUBLIC_KEY`.
- Secret key → Worker secret:
  ```
  pnpm exec wrangler secret put STRIPE_SECRET_KEY --name stepkite
  ```

2.5 Developers → Webhooks → Add endpoint. URL: `https://stepkite.com/api/stripe/webhook` (or the current workers.dev host while the custom domain is pending). Events to send: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `customer.created`. Copy the signing secret and set:

```
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET --name stepkite
```

2.6 Developers → Radar → Rules. Enable the recommended defaults. Add a custom rule: block a trial start when the email domain is in the disposable list (the `isDisposable` helper in `lib/paywall/blocklist.ts` enforces this on our side too).

## 3. Cloudflare dashboard (10 min)

3.1 WAF rate limiting rules — Security → WAF → Rate limiting rules:

- `/api/job-preview`: 10 requests per minute per IP, block.
- `/api/newsletter`: 5 requests per minute per IP, block.
- `/api/auth/*`: 10 requests per minute per IP, block.
- `/api/paywall/*`: 10 requests per minute per IP, block.
- `/api/stripe/webhook`: no rule (Stripe's IP range).

3.2 Bot Fight Mode — Security → Bots → toggle on.

3.3 Turnstile secret rotation. The old `TURNSTILE_SECRET` was leaked in a chat log. Rotate it:

```
pnpm exec wrangler turnstile widget delete 0x4AAAAAAFuKX0ye0q3FPyLZ
pnpm exec wrangler turnstile widget create "stepkite" \
  --domain stepkite.calebky33.workers.dev \
  --domain stepkite.com \
  --domain localhost \
  --mode managed
```

The command prints a new sitekey and secret. Copy the sitekey into the GitHub Actions secret `NEXT_PUBLIC_TURNSTILE_SITEKEY` and the secret into the Worker:

```
pnpm exec wrangler secret put TURNSTILE_SECRET --name stepkite
```

3.4 (Optional, needs the custom domain) Workers Custom Domain — Workers & Pages → stepkite → Custom Domain → add `stepkite.com`. Change DNS in your registrar to Cloudflare nameservers.

3.5 Uptime monitor — Notifications → Create. Monitor `https://stepkite.com/api/health` every 1 minute, alert email on 3 failures.

## 4. GitHub Actions secrets (5 min)

Secrets go in <https://github.com/calebky33/stepkite/settings/secrets/actions>:

| Name                            | Where it comes from          | Scope |
| ------------------------------- | ---------------------------- | ----- |
| `CLOUDFLARE_API_TOKEN`          | Already set                  | repo  |
| `CLOUDFLARE_ACCOUNT_ID`         | Already set                  | repo  |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY` | Already set (needs rotation) | repo  |
| `SUPABASE_URL`                  | Supabase Settings → API      | repo  |
| `SUPABASE_ANON_KEY`             | Supabase Settings → API      | repo  |
| `STRIPE_PUBLIC_KEY`             | Stripe Developers → API keys | repo  |

Worker secrets go through `wrangler secret put` (see commands above):

| Name                        | Where it comes from            |
| --------------------------- | ------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API        |
| `STRIPE_SECRET_KEY`         | Stripe Developers → API keys   |
| `STRIPE_WEBHOOK_SECRET`     | Stripe Developers → Webhooks   |
| `TURNSTILE_SECRET`          | Cloudflare Turnstile (rotated) |

## 5. First deploy with billing live

Once every row above is set:

```
gh workflow run upload.yml --ref master
```

Then from the new version id (Cloudflare dashboard → Deployments), test:

- Sign up with a Google account → account page shows Free.
- Click Start free trial → account shows Pro trial, Cancel visible.
- From a logged-out window, visit `/uk/tracker` → redirect to sign-up.
- Try the paywall at `/pricing` → Stripe Checkout opens with the correct product.
- Pay with a test card → webhook arrives → account page shows the new plan.

If any step fails, roll back:

```
pnpm exec wrangler rollback <previous-version-id>
```

## Changing a price later

Create a new Stripe price (never mutate an existing one). Update the `stripe_price_id` in the `plans` row for that code. Existing subscriptions keep the old price until they renew.
