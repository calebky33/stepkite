import type { SVGProps } from "react";

/**
 * Stepkite logo as inline SVG so it follows the light and dark tokens and uses the
 * page's own Plus Jakarta Sans. Colours come from --logo-* in app/globals.css.
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 330 72"
      role="img"
      aria-label="Stepkite"
      className={className}
      {...props}
    >
      <polygon points="36,4.5 11.25,29.25 36,67.5" fill="var(--logo-a)" />
      <polygon points="36,4.5 60.75,29.25 36,67.5" fill="var(--logo-b)" />
      <polygon
        points="27,47.53 32.34,47.53 32.34,39.66 40.22,39.66 40.22,31.78 49.5,31.78 49.5,35.72 44.16,35.72 44.16,43.59 36.28,43.59 36.28,51.47 27,51.47"
        fill="var(--logo-steps)"
      />
      <text
        x="80"
        y="50"
        fontSize="46"
        fontWeight="800"
        letterSpacing="-1.4"
        fill="currentColor"
        style={{ fontFamily: "var(--font-display)" }}
      >
        stepkite
      </text>
    </svg>
  );
}
