// Mirror of the sign-up route: answers 503 until Supabase lands. See the comment there.
import { z } from "zod";

const bodySchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(200),
    next: z.string().max(1024).optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
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
