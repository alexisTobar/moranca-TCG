import { GAMES, type GameId } from "@/lib/games";

/** Ancho de la placa en cada tamaño. Todas comparten la misma proporción. */
const PLATE = {
  tile: "w-[104px] sm:w-[168px]",
  sm: "w-[124px]",
  md: "w-[168px]",
  lg: "w-[152px] sm:w-[224px]",
} as const;

// Placa de referencia (proporción 224 x 104) y área que ocupa cada logo dentro de ella.
const PLATE_W = 224;
const PLATE_H = 104;
const LOGO_AREA = 6800;

/**
 * Logo oficial del juego dentro de una placa idéntica para todos. Cada logo se
 * dimensiona por área (no por alto ni por ancho fijos): un logo muy ancho como
 * el de One Piece y uno casi cuadrado como el de Mitos y Leyendas terminan
 * pesando lo mismo a la vista.
 */
export function GameLogo({
  game,
  size = "md",
  className = "",
}: {
  game: GameId;
  size?: keyof typeof PLATE;
  className?: string;
}) {
  const meta = GAMES[game];
  const w = Math.min(Math.sqrt(LOGO_AREA * meta.logoRatio), PLATE_W * 0.82);
  const h = Math.min(w / meta.logoRatio, PLATE_H * 0.78);
  const width = h * meta.logoRatio;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/[0.06] ${PLATE[size]} ${className}`}
      style={{ aspectRatio: `${PLATE_W} / ${PLATE_H}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meta.logo}
        alt={meta.name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="object-contain"
        style={{
          width: `${(width / PLATE_W) * 100}%`,
          height: `${(h / PLATE_H) * 100}%`,
        }}
      />
    </span>
  );
}
