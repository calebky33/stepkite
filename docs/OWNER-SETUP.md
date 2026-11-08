# OWNER-SETUP.md

Walkthrough for the owner to connect Supabase, Paystack and the three Cloudflare dashboard toggles. Nothing in the code reads a secret you type here. Store every secret in the service's own dashboard (Supabase, Paystack, Cloudflare Workers), or as a GitHub Actions repository secret for build-time variables.

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

## 2. Paystack (20 min)

Paystack supports NGN, GHS, ZAR, KES and USD. GBP and INR are not available, so Stepkite prices are USD only at launch. USD on Paystack needs a Nigeria or Kenya merchant account with USD activation.

2.1 Create a Paystack account at <https://dashboard.paystack.com/signup>. Fill in the business profile and bank details. Settings → Preferences → request USD activation (business documents required). Wait for approval before the first charge.

2.2 In Payments → Plans, create two subscription plans (amounts in cents, USD):

- `Stepkite Monthly` → interval `monthly`, amount `999`.
- `Stepkite Yearly` → interval `annually`, amount `3900`.

Lifetime does not need a plan: the checkout route initialises a one-time transaction for `14900` cents directly.

2.3 Copy each plan's `PLN_...` code. In the Supabase SQL editor, insert the plans:

```sql
insert into plans (code, paystack_plan_code, amount_cents, currency, interval, interval_count, active)
values
  ('monthly',  'PLN_i39qwcg76iesqck',  999, 'USD', 'month', 1, true),
  ('yearly',   'PLN_thy98vgrfkw4s2c', 3900, 'USD', 'year',  1, true),
  ('lifetime', null,                 14900, 'USD', null,    null, true);
```

The two `PLN_...` codes above are the live plans created on 2026-11-07. Confirm they still exist and match in the Paystack dashboard before running this insert.

2.4 Settings → API Keys & Webhooks:

- Public key → GitHub Actions secret `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
- Secret key → Worker secret:
  ```
  pnpm exec wrangler secret put PAYSTACK_SECRET_KEY --name stepkite
  ```

2.5 Settings → API Keys & Webhooks → Webhook URL: `https://stepkite.app/api/paystack/webhook`. Events sent are all events Paystack supports; the route acts on `charge.success`, `subscription.create`, `subscription.not_renew`, `subscription.disable` and `invoice.payment_failed`, and acknowledges the rest. Refunds are done by hand in the Paystack dashboard.

Copy the signing secret (`whsec_...`) from the same page and set it as a Worker secret:

```
pnpm exec wrangler secret put PAYSTACK_WEBHOOK_SECRET --name stepkite
```

2.6 Abuse controls. Paystack does not ship a Radar equivalent, so the brakes live on our side: `lib/paywall/blocklist.ts` blocks disposable email domains on `/api/trial/start`, Cloudflare WAF rate-limits `/api/auth/*` and `/api/paywall/*` (see section 3), and `trial_fingerprints` enforces one trial per browser+IP+email.

## 3. Cloudflare dashboard (10 min)

3.1 WAF rate limiting rules — Security → WAF → Rate limiting rules:

- `/api/job-preview`: 10 requests per minute per IP, block.
- `/api/newsletter`: 5 requests per minute per IP, block.
- `/api/auth/*`: 10 requests per minute per IP, block.
- `/api/paywall/*`: 10 requests per minute per IP, block.
- `/api/paystack/webhook`: no rule (Paystack's IP range).

3.2 Bot Fight Mode — Security → Bots → toggle on.

3.3 Turnstile secret rotation. The old `TURNSTILE_SECRET` was leaked in a chat log. Rotate it:

```
pnpm exec wrangler turnstile widget delete 0x4AAAAAAFuKX0ye0q3FPyLZ
pnpm exec wrangler turnstile widget create "stepkite" \
  --domain stepkite.calebky33.workers.dev \
  --domain stepkite.app \
  --domain localhost \
  --mode managed
```

The command prints a new sitekey and secret. Copy the sitekey into the GitHub Actions secret `NEXT_PUBLIC_TURNSTILE_SITEKEY` and the secret into the Worker:

```
pnpm exec wrangler secret put TURNSTILE_SECRET --name stepkite
```

3.4 Custom domain: `stepkite.app` is registered at Cloudflare and connected to the Worker (Workers & Pages → stepkite → Domains). `stepkite.com` belongs to someone else, so never use it.

3.5 Uptime monitor — Notifications → Create. Monitor `https://stepkite.app/api/health` every 1 minute, alert email on 3 failures.

## 4. GitHub Actions secrets (5 min)

Secrets go in <https://github.com/calebky33/stepkite/settings/secrets/actions>:

| Name                              | Where it comes from          | Scope |
| --------------------------------- | ---------------------------- | ----- |
| `CLOUDFLARE_API_TOKEN`            | Already set                  | repo  |
| `CLOUDFLARE_ACCOUNT_ID`           | Already set                  | repo  |
| `NEXT_PUBLIC_TURNSTILE_SITEKEY`   | Already set (needs rotation) | repo  |
| `SUPABASE_URL`                    | Supabase Settings → API      | repo  |
| `SUPABASE_ANON_KEY`               | Supabase Settings → API      | repo  |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Settings → API Keys | repo  |

Worker secrets go through `wrangler secret put` (see commands above):

| Name                        | Where it comes from                                      |
| --------------------------- | -------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API                                  |
| `PAYSTACK_SECRET_KEY`       | Paystack Settings → API Keys                             |
| `PAYSTACK_WEBHOOK_SECRET`   | Paystack Settings → API Keys & Webhooks (signing secret) |
| `TURNSTILE_SECRET`          | Cloudflare Turnstile (rotated)                           |

## 5. First deploy with billing live

Once every row above is set:

```
gh workflow run upload.yml --ref master
```

Then from the new version id (Cloudflare dashboard → Deployments), test:

- Sign up with a Google account → account page shows Free.
- Click Start free trial → account shows Pro trial, Cancel visible.
- From a logged-out window, visit `/uk/tracker` → redirect to sign-up.
- Try the paywall at `/pricing` → Paystack hosted checkout opens with the correct plan.
- Pay with a Paystack test card → webhook arrives → account page shows the new plan.

If any step fails, roll back:

```
pnpm exec wrangler rollback <previous-version-id>
```

## Changing a price later

Create a new Paystack plan (never mutate an existing one). Update the `paystack_plan_code` in the `plans` row for that code. Existing subscriptions keep the old price until they renew.

## The signed-in e2e test account

`e2e/cv.spec.ts` and `e2e/tracker.spec.ts` need a real account. Playwright reads
`E2E_EMAIL` and `E2E_PASSWORD` from the shell and skips those specs when either is missing.

`e2e.test@stepkite.app` exists on the project and is confirmed. The password is not in this repo;
it lives in your password manager. Set both variables in the shell before a run:

```
E2E_EMAIL=e2e.test@stepkite.app E2E_PASSWORD=... pnpm e2e
```

`e2e/auth.setup.ts` signs in once, checks that a Supabase session cookie was stored, and writes
`e2e/.auth/user.json` (gitignored). A missing cookie now fails the setup instead of silently
saving an empty session, which is what made the signed-in specs fail with a redirect to `/sign-up`.

Two other things the e2e run needs: email confirmation is on for this project, so a new account
cannot sign in until the link is clicked. For the test account, confirm it once in Supabase
(Authentication → Users → the user → Confirm email).
