/**
 * Shared streaming body cap used by auth and paywall routes. Mirrors the pattern first used in
 * app/api/job-preview/route.ts: read the request body in chunks and stop at the byte cap so a
 * runaway client cannot pin the Worker. See docs/MONETIZATION.md and docs/RULES.md.
 */

export const DEFAULT_BODY_LIMIT = 4096;

export type BodyRead =
  { kind: "ok"; text: string } | { kind: "too-large" } | { kind: "read-failed" };

/**
 * Reads the request body as text, up to `limit` bytes. Returns `too-large` once the cap is hit
 * and `read-failed` on a stream error. Never throws, never logs. The caller maps the result to
 * a JSON response.
 */
export async function readBodyCapped(
  request: Request,
  limit: number = DEFAULT_BODY_LIMIT,
): Promise<BodyRead> {
  if (!request.body) return { kind: "ok", text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        return { kind: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: "read-failed" };
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.length;
  }
  return { kind: "ok", text: new TextDecoder().decode(buf) };
}
