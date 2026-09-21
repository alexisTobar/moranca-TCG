import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Handshake,
  Landmark,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { GAME_LIST } from "@/lib/games";
import { activeStoreWhere } from "@/lib/store";
import { siteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { GameLogo } from "@/components/GameLogo";
import { Reveal } from "@/components/Reveal";
import { CONTACT_EMAIL } from "@/lib/legal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Quiénes somos",
  description:
    "Win Condition TCG es el marketplace chileno de cartas coleccionables: conectamos a compradores y vendedores de Magic, Pokémon, One Piece y Mitos y Leyendas con reglas claras y compra segura.",
  alternates: { canonical: "/quienes-somos" },
};

const PILLARS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: LockKeyhole,
    title: "Stock reservado",
    text: "Cuando compras, tus cartas quedan apartadas a tu nombre mientras pagas. Nadie más puede llevárselas.",
  },
  {
    icon: Landmark,
    title: "Pago directo y con referencia",
    text: "Transfieres al vendedor con un código único. Sin intermediarios en el dinero y con comprobante en cada orden.",
  },
  {
    icon: MessageSquare,
    title: "Todo queda por escrito",
    text: "Cada orden tiene su chat y su historial, para que compradores y vendedores se pongan de acuerdo con claridad.",
  },
  {
    icon: BadgeCheck,
    title: "Vendedores con reputación",
    text: "Calificaciones, reseñas y ventas visibles, más tiendas verificadas para quienes venden con marca propia.",
  },
];

export default async function AboutPage() {
  const [listings, sellers, stores] = await Promise.all([
    safeQuery(() => prisma.listing.count({ where: { status: "ACTIVE", stock: { gt: 0 } } }), 0),
    safeQuery(
      () => prisma.user.count({ where: { active: true, role: { in: ["SELLER", "ADMIN"] }, listings: { some: { status: "ACTIVE" } } } }),
      0
    ),
    safeQuery(() => prisma.store.count({ where: { ...activeStoreWhere(), seller: { active: true } } }), 0),
  ]);

  const stats: Array<[string, string]> = [
    [String(GAME_LIST.length), "Juegos"],
    [listings.toLocaleString("es-CL"), "Publicaciones activas"],
    [sellers.toLocaleString("es-CL"), "Vendedores activos"],
    ...(stores > 0 ? ([[String(stores), stores === 1 ? "Tienda premium" : "Tiendas premium"]] as Array<[string, string]>) : []),
  ];

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "Quiénes somos · Win Condition TCG",
          url: `${siteUrl()}/quienes-somos`,
          about: { "@type": "Organization", name: "Win Condition TCG", url: siteUrl() },
        }}
      />

      {/* HERO */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="animate-blob pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-16 pt-14 text-center lg:pb-24 lg:pt-20">
          <span className="animate-fade-up glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">
            <Handshake className="h-3.5 w-3.5" strokeWidth={2} />
            Quiénes somos
          </span>
          <h1 className="animate-fade-up delay-1 mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            El punto de encuentro de la comunidad <span className="text-gold-gradient">TCG</span> de Chile
          </h1>
          <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Win Condition TCG nació para que comprar y vender cartas coleccionables en Chile sea simple, ordenado y
            confiable, sin perderte entre chats, capturas y transferencias sueltas.
          </p>
        </div>
      </section>

      {/* CIFRAS */}
      <section className="mx-auto -mt-8 max-w-5xl px-4">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-800 shadow-xl sm:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="bg-white px-4 py-6 text-center">
              <dt className="font-display text-3xl font-bold text-carbon">{value}</dt>
              <dd className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* QUÉ HACEMOS */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">Nuestra misión</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
            Que encontrar y comprar la carta correcta no sea un problema
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-400">
            Reunimos en un solo lugar a coleccionistas, jugadores y tiendas de Magic, Pokémon, One Piece y Mitos y
            Leyendas. Cada publicación muestra la imagen real del catálogo oficial, y puedes comparar precios entre
            vendedores, filtrar por idioma y estado, y comprar con reglas claras para ambas partes.
          </p>
        </div>

        <Reveal className="stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="lift rounded-2xl card-surface p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                <p.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-carbon">{p.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-400">{p.text}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* JUEGOS */}
      <section className="bg-ink-900 py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center font-display text-2xl font-bold tracking-tight text-carbon">Los juegos que encuentras aquí</h2>
          <div className="mt-8 grid grid-cols-2 items-center justify-items-center gap-4 lg:grid-cols-4">
            {GAME_LIST.map((g) => (
              <Link key={g.id} href={`/cartas?game=${g.id}`} aria-label={g.name} className="transition hover:-translate-y-1">
                <GameLogo game={g.id} size="md" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TRANSPARENCIA */}
      <section className="mx-auto max-w-4xl px-4 py-16 lg:py-20">
        <div className="rounded-3xl card-surface p-7 sm:p-10">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-carbon sm:text-3xl">
            Lo que somos, y lo que no
          </h2>
          <div className="mt-4 grid gap-6 text-[15px] leading-relaxed text-ink-300 md:grid-cols-2">
            <div>
              <p className="font-display text-[15px] font-bold text-carbon">Somos</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>Un marketplace: la tecnología que une a compradores y vendedores.</li>
                <li>Quienes reservan el stock, generan tu código de pago y guardan el comprobante.</li>
                <li>Quienes vigilan el respeto de las reglas y actúan sobre las cuentas que no las cumplen.</li>
              </ul>
            </div>
            <div>
              <p className="font-display text-[15px] font-bold text-carbon">No somos</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                <li>El vendedor de los productos: cada venta es entre comprador y vendedor.</li>
                <li>Quienes manejan el dinero: transfieres directo al vendedor.</li>
                <li>Un servicio de devoluciones o reembolsos, por la misma razón.</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-[14px] text-ink-400">
            Lee los detalles en los{" "}
            <Link href="/terminos-y-condiciones" className="font-semibold text-brand-600 hover:text-brand-700">
              Términos y condiciones
            </Link>
            , la{" "}
            <Link href="/politica-de-privacidad" className="font-semibold text-brand-600 hover:text-brand-700">
              Política de privacidad
            </Link>{" "}
            y la página de{" "}
            <Link href="/devoluciones" className="font-semibold text-brand-600 hover:text-brand-700">
              Devoluciones y reclamos
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CIERRE */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="bg-hero relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:px-14">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-[#2a1d00]">
              <Store className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">Súmate a la comunidad</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Encuentra tus próximas cartas o empieza a vender las tuyas. Si tienes una tienda, llévala al siguiente nivel
              con tu propio link y QR.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/cartas" className="btn btn-gold btn-lg">
                Explorar catálogo
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Link href="/tiendas" className="btn btn-glass btn-lg">
                Abre tu tienda
              </Link>
            </div>
            {CONTACT_EMAIL && (
              <p className="mt-6 text-[13px] text-white/55">
                ¿Hablamos? <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-gold-300 hover:text-gold-200">{CONTACT_EMAIL}</a>
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
