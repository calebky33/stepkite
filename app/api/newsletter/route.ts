import { z } from "zod";

const bodySchema = z.object({ email: z.email().max(254) });

/** No mailing list is connected yet, so nothing is stored or sent. */
export async function POST(request: Request): Promise<Response> {
  if (!bodySchema.safeParse(await request.json().catch(() => null)).success) {
    return Response.json({ error: "invalid_email" }, { status: 400 });
  }
  return Response.json({ error: "not_available_yet" }, { status: 503 });
}
