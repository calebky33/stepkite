import { isCountry, type CountryCode } from "@/lib/countries";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  /** Display name from the sign in provider (Google), or null when there is none. */
  name: string | null;
  /** The market chosen at sign-up or in account settings. Null until one is set. */
  country: CountryCode | null;
};

/** Key in Supabase user_metadata that holds the home market. */
export const HOME_COUNTRY_KEY = "home_country";

/** user_metadata can be edited by the user, so only a registry code is trusted. */
export function homeCountry(metadata: unknown): CountryCode | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const value = (metadata as Record<string, unknown>)[HOME_COUNTRY_KEY];
  return typeof value === "string" && isCountry(value) ? value : null;
}

/** The provider puts the name in user_metadata. It is untrusted text, so only keep a plain,
 *  trimmed, bounded string. */
function displayName(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null) return null;
  const record = metadata as Record<string, unknown>;
  for (const key of ["full_name", "name"]) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.replace(/\s+/g, " ").trim().slice(0, 60);
    if (trimmed) return trimmed;
  }
  return null;
}

export async function getSession(_request?: Request): Promise<SessionUser | null> {
  // The argument is unused: the cookie bridge reads from next/headers. It stays optional so
  // route handlers can still write `getSession(request)` as a self-documenting pattern.
  void _request;
  const supabase = await createSupabaseServer();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return {
    id: data.user.id,
    email: data.user.email ?? "",
    createdAt: data.user.created_at,
    name: displayName(data.user.user_metadata),
    country: homeCountry(data.user.user_metadata),
  };
}

/** Requires a signed-in user. Returns a 401 Response otherwise, which routes should return. */
export async function requireSession(request?: Request): Promise<SessionUser | Response> {
  const user = await getSession(request);
  if (!user) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }
  return user;
}
