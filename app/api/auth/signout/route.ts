import { USER_COOKIE } from "@/lib/cv/userCookie";
import { rateLimit } from "@/lib/rateLimit";
import { createSupabaseServer } from "@/lib/supabase/server";

/**
 * Clears the Supabase session for the current browser. Same-origin only.
 * Returns 503 when Supabase is not configured, mirroring delete-my-data.
 */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await rateLimit(request, "RL_AUTH"))) {
    return Response.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  const supabase = await createSupabaseServer();
  if (!supabase) {
    return Response.json(
      { error: "not_available" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // A failed signOut leaves the cookies in place. Report so the client stays on /account.
      return Response.json(
        { error: "signout_failed" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  } catch {
    return Response.json(
      { error: "signout_failed" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  // Drop the CV page's signed in hint right away rather than waiting for the next page request.
  headers.append("Set-Cookie", `${USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
  return Response.json({ signedOut: true }, { status: 200, headers });
}
