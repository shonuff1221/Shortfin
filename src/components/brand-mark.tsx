/**
 * FinMark — the Shortfin shark-fin mark (inline SVG, currentColor).
 * One source of truth for the logo glyph: header chips, token gate, landing,
 * favicons/OG are derived from the same geometry (fin sweeping up-right over
 * a waterline wave).
 */
export function FinMark({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* fin: leading edge sweeps up to the tip, trailing edge is concave */}
      <path
        d="M5 20C6.8 12.4 10.6 7.2 18.5 4c-1.6 5-3.2 10.4-1 16H5Z"
        fill="currentColor"
      />
      {/* waterline */}
      <path
        d="M2 22c1.6-1.3 3.2-1.3 4.8 0 1.6 1.3 3.2 1.3 4.8 0 1.6-1.3 3.2-1.3 4.8 0 1.6 1.3 3.2 1.3 4.8 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}
