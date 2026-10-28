import { ImageResponse } from "next/og";
import { z } from "zod";
import { COUNTRIES, COUNTRY_INFO, formatMoney } from "@/lib/countries";
import { MAX_GROSS, MIN_GROSS } from "@/lib/tax/types";

const querySchema = z.object({
  country: z.enum(COUNTRIES),
  gross: z.coerce.number().min(MIN_GROSS).max(MAX_GROSS),
});

/** Share image with a country and a salary only. No personal data, no tax figures. */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    country: url.searchParams.get("country"),
    gross: url.searchParams.get("gross"),
  });
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { country, gross } = parsed.data;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "#ffffff",
        color: "#111827",
      }}
    >
      <div style={{ fontSize: 36, color: "#4b5563" }}>{COUNTRY_INFO[country].name}</div>
      <div style={{ fontSize: 120, fontWeight: 700 }}>{formatMoney(gross, country)}</div>
      <div style={{ fontSize: 36, color: "#1a3fd1" }}>Stepkite</div>
    </div>,
    { width: 1200, height: 630 },
  );
}
