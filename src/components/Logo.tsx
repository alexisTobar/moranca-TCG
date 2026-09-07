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
        {/* Carta de atrás, apenas insinuada: el "deck" */}
        <rect
          x="6"
          y="9"
          width="22"
          height="30"
          rx="4"
          transform="rotate(-9 17 24)"
          fill="#eef2ff"
          stroke="#1d4ed8"
          strokeWidth="1.4"
        />
        {/* Carta de adelante, con la luna y la estrella: el "dream" */}
        <rect
          x="18"
          y="8"
          width="22"
          height="30"
          rx="4"
          transform="rotate(8 29 23)"
          fill="#1d4ed8"
        />
        <path
          transform="translate(21.5 12.5) scale(0.375)"
          d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z"
          fill="#eef2ff"
        />
        <path d="M33 26 34.12 28.88 37 30 34.12 31.12 33 34 31.88 31.12 29 30 31.88 28.88Z" fill="#eef2ff" />
      </svg>
      <span className="leading-none">
        <span className="block font-semibold tracking-[0.14em] text-[13px] text-ink-200">
          DREAM DECK
        </span>
        <span className="block brand-text font-display text-[15px] font-bold tracking-[0.34em]">
          TCG
        </span>
      </span>
    </span>
  );
}
