import { countryFromRequest } from "@/lib/geo";

/**
 * The visitor's market, guessed from Cloudflare's country header. Used only to suggest a default
 * country. Nothing is stored, and the answer is never cached because it differs per visitor.
 */
export function GET(request: Request): Response {
  return Response.json(
    { country: countryFromRequest(request.headers) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
