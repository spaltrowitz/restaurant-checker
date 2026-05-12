type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function BrandLogo({
  className = "",
  markClassName = "h-9 w-9",
  textClassName = "text-base sm:text-lg",
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff0dc_0%,#ffb86b_42%,#f97316_100%)] shadow-[0_8px_18px_rgba(232,93,36,0.2)] ring-1 ring-white/80 ${markClassName}`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 48" className="h-full w-full overflow-visible" focusable="false">
          <path d="M11.2 15.6c2-3.8 6.4-6.2 12.8-6.2s10.8 2.4 12.8 6.2" fill="none" stroke="#fffaf5" strokeLinecap="round" strokeWidth="2.4" opacity="0.9" />
          <path
            d="M9.2 24.1c0-8 6.5-13.2 14.8-13.2s14.8 5.2 14.8 13.2c0 8.7-6.8 14.9-14.8 14.9S9.2 32.8 9.2 24.1Z"
            fill="#fffaf5"
          />
          <path
            d="M14.1 25.1c-1.6-2.1-2.5-4.9-2.6-8 2.1 1.1 4.2 1.6 6.3 1.6 1.9 0 3.9-.4 6.2-1.2 2.3.8 4.3 1.2 6.2 1.2 2.1 0 4.2-.5 6.3-1.6-.1 3.1-1 5.9-2.6 8"
            fill="#ffe4bc"
          />
          <circle cx="18.7" cy="26" r="1.8" fill="#241610" />
          <circle cx="29.3" cy="26" r="1.8" fill="#241610" />
          <circle cx="15.6" cy="29.7" r="2.1" fill="#ff9aa2" opacity="0.75" />
          <circle cx="32.4" cy="29.7" r="2.1" fill="#ff9aa2" opacity="0.75" />
          <path d="M20.1 31.1c1.7 1.7 6.1 1.7 7.8 0" fill="none" stroke="#241610" strokeLinecap="round" strokeWidth="1.9" />
          <g transform="rotate(9 35.8 16.6)">
            <path
              d="M30.1 10.5h11.8c1 0 1.8.8 1.8 1.8v1.8c-1.4 0-2.4 1.1-2.4 2.5s1.1 2.5 2.4 2.5v1.8c0 1-.8 1.8-1.8 1.8H30.1c-1 0-1.8-.8-1.8-1.8v-1.8c1.4 0 2.4-1.1 2.4-2.5s-1.1-2.5-2.4-2.5v-1.8c0-1 .8-1.8 1.8-1.8Z"
              fill="#e85d24"
              stroke="#fffaf5"
              strokeWidth="1"
            />
            <path d="M34 20.2 38.3 13M33.6 14.1h.1M38.8 19.6h.1" fill="none" stroke="#fffaf5" strokeLinecap="round" strokeWidth="1.6" />
            <path d="M31.8 12.6v7.9" fill="none" stroke="#fffaf5" strokeLinecap="round" strokeWidth="0.8" strokeDasharray="0.5 1.5" />
          </g>
          <path d="M8.5 13.2 7 11.4M10.8 11.1l.2-2.3M39.8 31.8l2 1.2" fill="none" stroke="#fffaf5" strokeLinecap="round" strokeWidth="2" opacity="0.88" />
        </svg>
      </span>
      <span className={`font-black tracking-tight text-[var(--color-text-primary)] ${textClassName}`}>
        <span className="text-accent-gradient">Eat</span>Discounted
      </span>
    </span>
  );
}
