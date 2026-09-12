import Link from "next/link";
import { Logo } from "./Logo";
import { GAME_LIST } from "@/lib/games";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-900/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo height={92} />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-400">
            Tienda chilena de cartas coleccionables. Singles, sellados y mazos
            armados, con despacho a todo Chile.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-300">
            Juegos
          </h4>
          <ul className="space-y-2 text-[13px] text-ink-400">
            {GAME_LIST.map((g) => (
              <li key={g.id}>
                <Link href={`/cartas?game=${g.id}`} className="hover:text-carbon">
                  {g.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-300">
            Comprar
          </h4>
          <ul className="space-y-2 text-[13px] text-ink-400">
            <li>
              <Link href="/cartas" className="hover:text-carbon">
                Catálogo completo
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=SINGLE" className="hover:text-carbon">
                Singles
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=SEALED" className="hover:text-carbon">
                Sellados
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=DECK" className="hover:text-carbon">
                Mazos armados
              </Link>
            </li>
            <li>
              <Link href="/vendedores" className="hover:text-carbon">
                Vendedores
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-300">
            Win Condition
          </h4>
          <ul className="space-y-2 text-[13px] text-ink-400">
            <li>
              <Link href="/ayuda" className="hover:text-carbon">
                Cómo comprar
              </Link>
            </li>
            <li>
              <Link href="/ayuda#envios" className="hover:text-carbon">
                Envíos
              </Link>
            </li>
            <li>
              <Link href="/ayuda#estados" className="hover:text-carbon">
                Estados de carta
              </Link>
            </li>
            <li>
              <Link href="/ingresar" className="hover:text-carbon">
                Acceso vendedores
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-850">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Win Condition TCG · Hecho en Chile</p>
          <p className="text-ink-600">
            Imágenes de cartas vía Scryfall, pokemontcg.io, dotGG y api.myl.cl. Marcas
            propiedad de sus respectivos dueños.
          </p>
        </div>
      </div>
    </footer>
  );
}
