import Link from "next/link";
import { Logo } from "./Logo";
import { GAME_LIST } from "@/lib/games";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-800 bg-ink-900/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ink-400">
            Tienda chilena de cartas coleccionables. Singles, sellados y mazos
            armados, con envíos a todo Chile y pagos protegidos.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-300">
            Juegos
          </h4>
          <ul className="space-y-2 text-[13px] text-ink-400">
            {GAME_LIST.map((g) => (
              <li key={g.id}>
                <Link href={`/cartas?game=${g.id}`} className="hover:text-accent-300">
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
              <Link href="/cartas" className="hover:text-accent-300">
                Catálogo completo
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=SINGLE" className="hover:text-accent-300">
                Singles
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=SEALED" className="hover:text-accent-300">
                Sellados
              </Link>
            </li>
            <li>
              <Link href="/cartas?type=DECK" className="hover:text-accent-300">
                Mazos armados
              </Link>
            </li>
            <li>
              <Link href="/vendedores" className="hover:text-accent-300">
                Vendedores
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-300">
            Comarca
          </h4>
          <ul className="space-y-2 text-[13px] text-ink-400">
            <li>
              <Link href="/ayuda" className="hover:text-accent-300">
                Cómo comprar
              </Link>
            </li>
            <li>
              <Link href="/ayuda#envios" className="hover:text-accent-300">
                Envíos
              </Link>
            </li>
            <li>
              <Link href="/ayuda#estados" className="hover:text-accent-300">
                Estados de carta
              </Link>
            </li>
            <li>
              <Link href="/ingresar" className="hover:text-accent-300">
                Acceso vendedores
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-850">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Comarca TCG · Hecho en Chile</p>
          <p className="text-ink-600">
            Imágenes de cartas vía Scryfall, pokemontcg.io, dotGG y api.myl.cl. Marcas
            propiedad de sus respectivos dueños.
          </p>
        </div>
      </div>
    </footer>
  );
}
