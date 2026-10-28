import { z } from "zod";
import { COUNTRIES, COUNTRY_INFO } from "@/lib/countries";
import { readEnv } from "@/lib/env";
import { SITE_URL } from "@/lib/seo";
import { createStripe } from "@/lib/stripe";
import { createSupabaseServer } from "@/lib/supabase/server";

const bodySchema = z.object({
  country: z.enum(COUNTRIES),
  plan: z.enum(["pass", "annual"]),
});

/** Price ids live in Cloudflare settings, one per plan and currency. The client never sends a price. */
const PRICE_ENV = {
  pass: {
    GBP: "STRIPE_PRICE_PASS_GBP",
    USD: "STRIPE_PRICE_PASS_USD",
    INR: "STRIPE_PRICE_PASS_INR",
  },
  annual: {
    GBP: "STRIPE_PRICE_ANNUAL_GBP",
    USD: "STRIPE_PRICE_ANNUAL_USD",
    INR: "STRIPE_PRICE_ANNUAL_INR",
  },
} as const;

export async function POST(request: Request): Promise<Response> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const supabase = await createSupabaseServer();
  const stripe = createStripe();
  if (!supabase || !stripe) return Response.json({ error: "not_available" }, { status: 503 });

  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "sign_in_required" }, { status: 401 });

  const { country, plan } = parsed.data;
  const price = readEnv(PRICE_ENV[plan][COUNTRY_INFO[country].currency]);
  if (!price.ok) return Response.json({ error: "not_available" }, { status: 503 });

  // The annual plan has no webhook handler yet, so it must not take payment.
  if (plan === "annual") return Response.json({ error: "not_available" }, { status: 503 });

  // A fixed origin, not the request Host header, so a spoofed Host cannot redirect the buyer.
  const origin = SITE_URL;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === "pass" ? "payment" : "subscription",
      line_items: [{ price: price.value, quantity: 1 }],
      automatic_tax: { enabled: true },
      client_reference_id: data.user.id,
      metadata: { user_id: data.user.id, plan },
      success_url: `${origin}/account?checkout=done`,
      cancel_url: `${origin}/pricing`,
    });
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "checkout_failed" }, { status: 502 });
  }
}
