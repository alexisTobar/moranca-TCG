import { GAMES, isGameId } from "@/lib/games";

export function GameChip({ game, className = "" }: { game: string; className?: string }) {
  const meta = isGameId(game) ? GAMES[game] : null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300 ${className}`}
    >
      {meta?.short ?? game}
    </span>
  );
}
