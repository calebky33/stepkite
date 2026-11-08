import { z } from "zod";
import { saveHomeCountryIfMissing } from "@/lib/auth/homeCountry";
import { failure, guardAuthRequest, invalidBody, notAvailable, signedInResponse } from "@/lib/auth/guard";
import { safeNext } from "@/lib/auth/safe-next";
import { HOME_COUNTRY_KEY } from "@/lib/auth/session";
import { isCountry } from "@/lib/countries";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Creates an account with email and password through Supabase.
 *
 * Supabase creates the `profiles` row itself (trigger `on_auth_user_created`), so nothing here
 * writes a table. The market picked on the form goes into user_metadata as `home_country`;
 * `homeCountry()` in lib/auth/session checks it against the registry on every read, so a forged
 * value is ignored rather than stored anywhere trusted.
 *
 * When the project requires email confirmation, sign-up returns no session. The route then asks
 * the client to show the "check your inbox" state instead of redirecting.
 */
const bodySchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(8).max(200),
    next: z.string().max(1024).optional(),
    country: z
      .string()
      .refine((c) => isCountry(c))
      .optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const refused = await guardAuthRequest(request);
  if (refused) return refused;

  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return invalidBody();

  const supabase = await createSupabaseServer().catch(() => null);
  if (!supabase) return notAvailable();

  const { email, password, next, country } = parsed.data;
  // Where the confirmation link lands. The callback swaps the code for a session, then redirects.
  const callback = new URL("/api/auth/callback", new URL(request.url).origin);
  callback.searchParams.set("next", safeNext(next));

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callback.toString(),
        data: country ? { [HOME_COUNTRY_KEY]: country } : undefined,
      },
    });
    if (error) return signUpFailure(error);

    // No session means the project emails a confirmation link first.
    if (!data.session) return signedInResponse({ confirmEmail: true });

    // Fills the home market from the visitor's location when the form did not send one.
    await saveHomeCountryIfMissing(supabase, country ?? null, request.headers);
    return signedInResponse();
  } catch {
    return failure(502, "signup_failed");
  }
}

/** Maps a Supabase auth error to the codes the form knows. Never repeats the provider text. */
function signUpFailure(error: { code?: string; status?: number }): Response {
  switch (error.code) {
    case "weak_password":
      return failure(400, "password_too_weak");
    case "email_exists":
    case "user_already_exists":
      return failure(400, "email_taken");
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return failure(429, "rate_limited");
    case "signup_disabled":
    case "email_provider_disabled":
      return notAvailable();
    default:
      return error.status === 429 ? failure(429, "rate_limited") : failure(502, "signup_failed");
  }
}
