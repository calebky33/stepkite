import { NextResponse } from "next/server";
import { saveHomeCountryIfMissing } from "@/lib/auth/homeCountry";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServer().catch(() => null);
  if (!supabase) {
    return NextResponse.redirect(new URL("/sign-in?error=unavailable", url.origin));
  }

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/sign-in?error=exchange_failed", url.origin));
    }
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=exchange_failed", url.origin));
  }

  await saveHomeCountryIfMissing(supabase, url.searchParams.get("country"), request.headers);
  return NextResponse.redirect(new URL(next, url.origin));
}
