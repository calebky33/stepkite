-- Stripe to Paystack. The initial schema already ran on the live project, so this is forward only.
-- Nothing was ever charged through Stripe, so any stored Stripe ids are cleared, not carried over.
-- USD only at launch (Paystack has no GBP or INR).

begin;

-- plans: one Paystack plan code replaces the Stripe product and price ids.
update public.plans set stripe_price_id = null where stripe_price_id is not null;
alter table public.plans drop column stripe_product_id;
alter table public.plans rename column stripe_price_id to paystack_plan_code;
alter index public.plans_stripe_price_uniq rename to plans_paystack_plan_uniq;

alter table public.plans drop constraint plans_currency_check;
update public.plans set currency = 'USD' where currency <> 'USD';
alter table public.plans add constraint plans_currency_check check (currency = 'USD');

-- entitlements: Paystack customer and subscription codes replace the Stripe ids.
update public.entitlements
set stripe_customer_id = null, stripe_subscription_id = null
where stripe_customer_id is not null or stripe_subscription_id is not null;
alter table public.entitlements rename column stripe_customer_id to paystack_customer_code;
alter table public.entitlements rename column stripe_subscription_id to paystack_subscription_code;
alter table public.entitlements
  rename constraint entitlements_stripe_subscription_id_key to entitlements_paystack_subscription_code_key;
-- entitlements_customer_uniq keeps its name and now covers paystack_customer_code.

commit;
