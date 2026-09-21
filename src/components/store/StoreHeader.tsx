import Link from "next/link";
import Image from "next/image";
import { Megaphone, Search } from "lucide-react";
import { GAMES, type GameId } from "@/lib/games";

const TYPE_LABEL: Record<string, string> = { SINGLE: "Singles", SEALED: "Sellados", DECK: "Mazos" };

/**
 * Menú propio de una tienda premium. Va debajo del menú de Win Condition (que se mantiene arriba para
 * quien quiera pasar al marketplace) y todo lo que hay aquí filtra solo el catálogo de esta tienda.
 */
export function StoreHeader({
  slug,
  name,
  logoUrl,
  announcement,
  q,
  game,
  type,
  games,
  types,
  hasAbout,
}: {
  slug: string;
  name: string;
  logoUrl: string | null;
  announcement: string | null;
  q: string;
  game: string;
  type: string;
  /** Juegos en los que la tienda tiene publicaciones activas. */
  games: GameId[];
  /** Tipos de producto que la tienda tiene (SINGLE / SEALED / DECK). */
  types: string[];
  hasAbout: boolean;
}) {
  const base = `/tienda/${slug}`;
  const link = (p: Record<string, string>) => {
    const s = new URLSearchParams(p).toString();
    return `${base}${s ? `?${s}` : ""}#catalogo`;
  };
  const nothing = !game && !type && !q;

  const chip = (active: boolean) =>
    `shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
      active ? "bg-brand-600 text-white shadow-sm" : "text-ink-300 hover:bg-ink-850 hover:text-brand-700"
    }`;

  return (
    <>
      {announcement && (
        <div className="bg-brand-600 text-white">
          <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-semibold">
            <Megaphone className="h-4 w-4 shrink-0" strokeWidth={2} />
            {announcement}
          </p>
        </div>
      )}

      {/* Encabezado de la tienda (lo único que queda fijo al desplazar) */}
      <header className="z-40 border-b border-ink-800 bg-white/95 backdrop-blur-xl lg:sticky lg:top-[68px]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href={base} className="flex min-w-0 shrink-0 items-center gap-2.5 lg:max-w-[16rem]">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-600 font-display text-lg font-bold text-white">
              {logoUrl ? (
                <Image src={logoUrl} alt="" fill sizes="40px" className="object-cover" unoptimized />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </span>
            <span className="hidden truncate font-display text-[17px] font-bold tracking-tight text-carbon sm:block">{name}</span>
          </Link>

          <form action={`${base}#catalogo`} className="relative ml-1 min-w-0 flex-1 lg:max-w-xl">
            {game && <input type="hidden" name="game" value={game} />}
            {type && <input type="hidden" name="type" value={type} />}
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" strokeWidth={2} />
            <input
              name="q"
              defaultValue={q}
              placeholder={`Buscar en ${name}…`}
              aria-label={`Buscar en ${name}`}
              className="h-10 w-full rounded-full border border-ink-700 bg-ink-900 pl-10 pr-4 text-[13px] text-carbon outline-none transition placeholder:text-ink-500 focus:border-brand-500 focus:bg-white"
            />
          </form>

        </div>

        {/* Categorías y juegos de esta tienda; en pantallas chicas se desplazan de lado */}
        <nav aria-label="Categorías de la tienda" className="border-t border-ink-800">
          <div className="no-scrollbar mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-2">
            <Link href={base} className={chip(nothing)}>
              Inicio
            </Link>
            {types.map((t) => (
              <Link key={t} href={link({ type: t })} className={chip(type === t)}>
                {TYPE_LABEL[t]}
              </Link>
            ))}
            {games.length > 0 && <span className="mx-1.5 h-5 w-px shrink-0 bg-ink-800" />}
            {games.map((g) => (
              <Link key={g} href={link({ game: g })} className={chip(game === g)}>
                {GAMES[g].short}
              </Link>
            ))}
            {hasAbout && <span className="mx-1.5 h-5 w-px shrink-0 bg-ink-800" />}
            {hasAbout && (
              <a href="#nosotros" className={chip(false)}>
                Nosotros
              </a>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
