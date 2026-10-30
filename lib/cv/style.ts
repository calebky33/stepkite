import type { Cv } from "./schema";

type Style = Cv["style"];

/** Only these colours reach CSS. Each is dark enough for body text on a white page. */
export const APPROVED_ACCENTS = [
  "#1a3fd1",
  "#111827",
  "#0b5d3f",
  "#8a1c1c",
  "#1f4e5f",
  "#5a3e8a",
] as const;

export const FONT_STACKS = {
  system:
    "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Noto Sans Devanagari', 'Nirmala UI', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif",
  serif:
    "Georgia, 'Times New Roman', 'Noto Serif Devanagari', 'Nirmala UI', 'Noto Serif CJK SC', SimSun, serif",
} as const;

export const DEFAULT_STYLE: Style = {
  accent: APPROVED_ACCENTS[0],
  fontPair: "system",
  fontScale: 1,
  spacing: "normal",
  marginMm: 18,
};

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** Pulls every style token back inside the allowed range. Safe to call on any stored value. */
export function clampStyle(style: Style): Style {
  const accent = style.accent.toLowerCase();
  return {
    accent: (APPROVED_ACCENTS as readonly string[]).includes(accent)
      ? accent
      : DEFAULT_STYLE.accent,
    fontPair: Object.hasOwn(FONT_STACKS, style.fontPair) ? style.fontPair : DEFAULT_STYLE.fontPair,
    fontScale: clamp(style.fontScale, 0.9, 1.1, 1),
    spacing: style.spacing === "compact" || style.spacing === "roomy" ? style.spacing : "normal",
    marginMm: clamp(style.marginMm, 12, 24, 18),
  };
}

export function fontStack(fontPair: string): string {
  return Object.hasOwn(FONT_STACKS, fontPair)
    ? FONT_STACKS[fontPair as keyof typeof FONT_STACKS]
    : FONT_STACKS.system;
}

/** Page text at 100 percent, about 10 point, in CSS pixels. */
export const BASE_PX = 13.5;
/** Body text never prints smaller than 10 point (40 / 3 CSS pixels), whatever the scale. */
export const MIN_BODY_PX = 40 / 3;

/** Body size in CSS pixels: base times scale times density, floored at 10 point. */
export function bodyPx(fontScale: number, density: number): number {
  const scaled = BASE_PX * clamp(fontScale, 0.9, 1.1, 1) * density;
  return Math.max(MIN_BODY_PX, scaled);
}

const TALL_SCRIPTS = /[ऀ-ॿ぀-ヿ㐀-鿿가-힯]/;

/** Devanagari and CJK need more room between lines than Latin text does. */
export function lineHeightFor(text: string): number {
  return TALL_SCRIPTS.test(text) ? 1.5 : 1.4;
}
