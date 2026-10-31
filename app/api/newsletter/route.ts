import { z } from "zod";
import { rateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({ email: z.email().max(254) });
const MAX_REQUEST_BYTES = 4096;

function reply(body: Record<string, string>, status: number): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Reads the body as a stream and stops at the byte cap. Null when over the cap or unreadable. */
async function readBodyCapped(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return new TextDecoder().decode(buf);
}

/** No mailing list is connected yet, so nothing is stored or sent. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply({ error: "forbidden" }, 403);
  if (!(await rateLimit(request, "RL_NEWSLETTER"))) return reply({ error: "rate_limited" }, 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_REQUEST_BYTES)
    return reply({ error: "too_large" }, 413);
  const text = await readBodyCapped(request);
  if (text === null) return reply({ error: "too_large" }, 413);
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!bodySchema.safeParse(json).success) return reply({ error: "invalid_email" }, 400);
  return reply({ error: "not_available_yet" }, 503);
}
