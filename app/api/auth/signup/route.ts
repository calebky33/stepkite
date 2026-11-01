// Supabase sign-up lands in a later session. Until the owner connects a Supabase project
// and sets SUPABASE_URL and the keys, this route answers 503 so the UI shows "not open yet".
import { z } from "zod";

const bodySchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(8).max(200),
    next: z.string().max(1024).optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  // Shape-check the body so the UI learns of a 400 right away. Nothing is stored.
  let json: unknown = null;
  try {
    json = await request.json();
  } catch {
    json = null;
  }
  if (!bodySchema.safeParse(json).success) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  return Response.json({ error: "accounts_not_open_yet" }, { status: 503 });
}
