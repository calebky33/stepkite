/**
 * Server-side session helper. Once Supabase is wired, getSession reads the auth cookie and
 * returns the user. Right now there is no auth, so it returns null. Callers must handle null
 * by treating the visitor as anonymous.
 *
 * See docs/MONETIZATION.md for the sign-up flow this replaces.
 */
export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
};

export async function getSession(request: Request): Promise<SessionUser | null> {
  // Stub: no session until Supabase is wired. The request is read now (for the cookie header)
  // only so the signature matches the final version. See lib/supabase/server.ts (to be added).
  request.headers.get("cookie");
  return null;
}

/** Requires a signed-in user. Returns a 401 Response otherwise, which routes should return. */
export async function requireSession(request: Request): Promise<SessionUser | Response> {
  const user = await getSession(request);
  if (!user) {
    return Response.json({ error: "sign_in_required" }, { status: 401 });
  }
  return user;
}
