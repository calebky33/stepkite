import { NextResponse } from "next/server";
import { isCountry } from "@/lib/countries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));

  const supabase = await createSupabaseServer().catch(() => null);
  if (!supabase) {
    return NextResponse.redirect(new URL("/sign-in?error=unavailable", url.origin));
  }

  const callback = new URL("/api/auth/callback", url.origin);
  callback.searchParams.set("next", next);
  // The market picked on the sign-up page. Only a registry code is passed on.
  const country = url.searchParams.get("country");
  if (country && isCountry(country)) callback.searchParams.set("country", country);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback.toString() },
    });
    if (error || !data?.url) {
      return NextResponse.redirect(new URL("/sign-in?error=oauth", url.origin));
    }
    return NextResponse.redirect(data.url);
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", url.origin));
  }
}
