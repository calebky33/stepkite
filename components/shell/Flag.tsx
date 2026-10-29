import type { CountryCode } from "@/lib/countries";

/** Small flat flags, drawn inline. Decorative: the country name always sits beside them. */
export function Flag({ code }: { code: CountryCode }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 16"
      className="h-4 w-6 shrink-0 rounded-[2px]"
    >
      {code === "uk" ? (
        <>
          <rect width="24" height="16" fill="#012169" />
          <path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.2" />
          <path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.2" />
          <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.2" />
          <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="3.2" />
        </>
      ) : null}
      {code === "us" ? (
        <>
          <rect width="24" height="16" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={i * (16 / 13)} width="24" height={16 / 13} fill="#b22234" />
          ))}
          <rect width="10" height={(16 / 13) * 7} fill="#3c3b6e" />
        </>
      ) : null}
      {code === "in" ? (
        <>
          <rect width="24" height="5.34" fill="#ff9933" />
          <rect y="5.33" width="24" height="5.34" fill="#fff" />
          <rect y="10.66" width="24" height="5.34" fill="#138808" />
          <circle cx="12" cy="8" r="1.9" fill="none" stroke="#000080" strokeWidth="0.6" />
        </>
      ) : null}
    </svg>
  );
}
