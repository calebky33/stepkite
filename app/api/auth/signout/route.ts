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
  return Response.json(
    { signedOut: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
