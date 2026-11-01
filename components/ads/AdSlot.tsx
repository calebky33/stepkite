"use client";

/**
 * AdSlot renders a placeholder for an ad unit. It renders nothing when the ad provider is not
 * configured (NEXT_PUBLIC_AD_PROVIDER unset) and when the current page or plan hides ads.
 *
 * Per CLAUDE.md rule 4: ads only on calculator pages, guide pages, and the free-tier CV builder
 * sidebar. Never inside the preview or in exports. Never during the trial or on paid plans.
 *
 * This component is layout-only right now. A later session wires an actual provider through
 * NEXT_PUBLIC_AD_PROVIDER and hides itself when the viewer's entitlement is "trialing" or
 * "active", read from the Supabase session.
 */
export type AdSurface = "sidebar" | "inline" | "footer";

type Props = {
  surface: AdSurface;
  /** Where the slot appears, for later analytics only. Never used to track users. */
  slot: string;
  className?: string;
};

const PROVIDER = process.env.NEXT_PUBLIC_AD_PROVIDER ?? "";

export function AdSlot({ surface, slot, className }: Props) {
  if (!PROVIDER) return null;
  // Rendered only when a provider is configured. Dimensions follow surface.
  const base =
    "my-4 flex items-center justify-center rounded-input bg-surface-2 text-xs text-muted";
  const size =
    surface === "sidebar"
      ? "min-h-[250px] w-full max-w-[300px]"
      : surface === "inline"
        ? "min-h-[100px] w-full"
        : "min-h-[60px] w-full";
  return (
    <aside
      aria-label="Advertisement"
      className={`${base} ${size} ${className ?? ""}`}
      data-ad-surface={surface}
      data-ad-slot={slot}
    >
      Ad
    </aside>
  );
}
