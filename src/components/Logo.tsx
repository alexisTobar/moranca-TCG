export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <defs>
          <linearGradient id="cgGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d9a441" />
            <stop offset="55%" stopColor="#a3711f" />
            <stop offset="100%" stopColor="#7a4f14" />
          </linearGradient>
        </defs>
        <rect
          x="9"
          y="4"
          width="24"
          height="34"
          rx="4"
          transform="rotate(-12 21 21)"
          fill="#f5eee1"
          stroke="#a3711f"
          strokeWidth="1.5"
        />
        <rect
          x="15"
          y="9"
          width="24"
          height="34"
          rx="4"
          transform="rotate(8 27 26)"
          fill="#86242d"
          stroke="url(#cgGold)"
          strokeWidth="1.8"
        />
        <path
          d="M27 18.5l2.3 4.9 5.2.7-3.8 3.6.95 5.2-4.65-2.5-4.65 2.5.95-5.2-3.8-3.6 5.2-.7z"
          fill="url(#cgGold)"
        />
      </svg>
      <span className="leading-none">
        <span className="block font-semibold tracking-[0.16em] text-[13px] text-ink-200">
          COMARCA
        </span>
        <span className="block brand-text font-display text-[15px] font-bold tracking-[0.34em]">
          TCG
        </span>
      </span>
    </span>
  );
}
