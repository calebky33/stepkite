import { ImageResponse } from "next/og";
import { z } from "zod";
import { COUNTRIES, COUNTRY_SHORT_NAME, formatMoney } from "@/lib/countries";
import { MAX_GROSS, MIN_GROSS } from "@/lib/tax/types";

const DEFAULT_TITLE = "Stepkite";
const DEFAULT_SUBTITLE = "Take-home pay, CV and tracker";

const text = z.string().trim().min(1).max(100);

/** Empty or missing params are treated as absent so defaults apply. */
const ogQuerySchema = z.object({
  title: text.optional(),
  subtitle: text.optional(),
  country: z.enum(COUNTRIES).optional(),
  gross: z.coerce.number().min(MIN_GROSS).max(MAX_GROSS).optional(),
});

const CACHE = "public, max-age=86400";

/** Share image with text and a country only. No personal data, no tax figures. */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  for (const key of ["title", "subtitle", "country", "gross"]) {
    const value = url.searchParams.get(key);
    if (value !== null && value !== "") raw[key] = value;
  }
  const parsed = ogQuerySchema.safeParse(raw);
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { country, gross } = parsed.data;
  const title =
    parsed.data.title ??
    (country && gross !== undefined ? formatMoney(gross, country) : DEFAULT_TITLE);
  const subtitle = parsed.data.subtitle ?? DEFAULT_SUBTITLE;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#ffffff",
        color: "#111827",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <polygon points="32,4 10,26 32,60" fill="#111827" />
          <polygon points="32,4 54,26 32,60" fill="#1A3FD1" />
          <polygon
            points="24,42.25 28.75,42.25 28.75,35.25 35.75,35.25 35.75,28.25 44,28.25 44,31.75 39.25,31.75 39.25,38.75 32.25,38.75 32.25,45.75 24,45.75"
            fill="#FFFFFF"
          />
        </svg>
        <div style={{ fontSize: 36, fontWeight: 700 }}>Stepkite</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 40, color: "#4b5563" }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", fontSize: 32, color: "#1a3fd1" }}>
        {country ? COUNTRY_SHORT_NAME[country] : ""}
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": CACHE } },
  );
}
