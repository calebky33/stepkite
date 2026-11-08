import { z } from "zod";
import { saveHomeCountryIfMissing } from "@/lib/auth/homeCountry";
import { failure, guardAuthRequest, invalidBody, notAvailable, signedInResponse } from "@/lib/auth/guard";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Signs in with email and password. Supabase sets the session cookies through the server client.
 *
 * On success the home market is filled from the visitor's location when the account has none, so
 * a returning user who never picked one still lands on their own country. A failed write does not
 * block sign-in; see saveHomeCountryIfMissing.
 */
const bodySchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
    next: z.string().max(1024).optional(),
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

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) return signInFailure(error);

    await saveHomeCountryIfMissing(supabase, null, request.headers);
    return signedInResponse();
  } catch {
    return failure(502, "signin_failed");
  }
}

/**
 * One answer for a wrong email and a wrong password, so the form cannot be used to find out which
 * accounts exist. An unconfirmed address is a separate code because the user can act on it.
 */
function signInFailure(error: { code?: string; status?: number; message?: string }): Response {
  if (error.code === "email_not_confirmed") return failure(403, "email_not_confirmed");
  if (error.code === "invalid_credentials" || error.status === 400) {
    return failure(401, "invalid_credentials");
  }
  if (error.code === "over_request_rate_limit" || error.status === 429) {
    return failure(429, "rate_limited");
  }
  if (error.code === "email_provider_disabled") return notAvailable();
  return failure(502, "signin_failed");
}
