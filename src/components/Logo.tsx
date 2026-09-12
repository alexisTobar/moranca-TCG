const GOLD = "#D4A23D";
const CRIMSON = "#C31C4D";

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
        {/* Cartas en abanico, insinuadas detrás de la carta central */}
        <path
          d="M14 10 L22 20 L11 29"
          stroke={CRIMSON}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M34 10 L26 20 L37 29"
          stroke={CRIMSON}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M9 30 L11.5 35" stroke={CRIMSON} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M39 30 L36.5 35" stroke={CRIMSON} strokeWidth="1.6" strokeLinecap="round" />

        {/* Carta central con esquinas dobladas, y una corona */}
        <path
          d="M15 8h13l5 5v22a2 2 0 0 1-2 2h-8l-5-5V10a2 2 0 0 1 2-2Z"
          fill="none"
          stroke={GOLD}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M18.5 21 21 24l3-4 3 4 2.5-3v6.5h-11Z"
          fill={GOLD}
        />
      </svg>
      <span className="leading-none">
        <span
          className="block font-semibold tracking-[0.12em] text-[12px] text-ink-200"
          style={{ color: GOLD }}
        >
          WIN CONDITION
        </span>
        <span
          className="block font-display text-[15px] font-bold tracking-[0.34em]"
          style={{ color: CRIMSON }}
        >
          TCG
        </span>
      </span>
    </span>
  );
}
