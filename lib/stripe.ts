import Stripe from "stripe";
import { readEnv } from "@/lib/env";

/** Stripe client for Cloudflare Workers: fetch based HTTP, no Node sockets. Null when the key is not set. */
export function createStripe(): Stripe | null {
  const key = readEnv("STRIPE_SECRET_KEY");
  if (!key.ok) return null;
  return new Stripe(key.value, { httpClient: Stripe.createFetchHttpClient() });
}

export const cryptoProvider = Stripe.createSubtleCryptoProvider();
