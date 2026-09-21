import Link from "next/link";
import { ShieldCheck, Truck, Landmark, BadgeCheck } from "lucide-react";
import { Logo } from "./Logo";
import { GAME_LIST } from "@/lib/games";

const TRUST = [
  { icon: ShieldCheck, title: "Stock reservado", text: "Tus cartas quedan apartadas al comprar" },
  { icon: Landmark, title: "Pago por transferencia", text: "Directo al vendedor, con comprobante" },
  { icon: Truck, title: "Envíos a todo Chile", text: "Despacho con seguimiento o retiro" },
  { icon: BadgeCheck, title: "Vendedores verificados", text: "Tiendas y coleccionistas reales" },
];

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-300">
        {title}
      </h4>
      <ul className="space-y-2.5 text-[13px] text-white/60">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="transition hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-carbon text-white">
      <div className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-9 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.title} className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-gold-300 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[14px] font-bold">{t.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-white/50">{t.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo height={96} tone="light" />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-white/55">
            Tienda chilena de cartas coleccionables. Singles, sellados y mazos armados, con
            despacho a todo Chile.
          </p>
        </div>

        <FooterCol
          title="Juegos"
          links={GAME_LIST.map((g) => ({ href: `/cartas?game=${g.id}`, label: g.name }))}
        />
        <FooterCol
          title="Comprar"
          links={[
            { href: "/cartas", label: "Catálogo completo" },
            { href: "/cartas?type=SINGLE", label: "Singles" },
            { href: "/cartas?type=SEALED", label: "Sellados" },
            { href: "/cartas?type=DECK", label: "Mazos armados" },
            { href: "/vendedores", label: "Vendedores" },
          ]}
        />
        <FooterCol
          title="Win Condition"
          links={[
            { href: "/ayuda", label: "Cómo comprar" },
            { href: "/ayuda#envios", label: "Envíos" },
            { href: "/ayuda#estados", label: "Estados de carta" },
            { href: "/tiendas", label: "Abre tu tienda" },
            { href: "/ingresar", label: "Acceso vendedores" },
          ]}
        />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Win Condition TCG · Hecho en Chile</p>
          <p>
            Imágenes de cartas vía Scryfall, pokemontcg.io, dotGG y api.myl.cl. Marcas propiedad de
            sus respectivos dueños.
          </p>
        </div>
      </div>
    </footer>
  );
}
