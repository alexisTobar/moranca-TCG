import Link from "next/link";
import Image from "next/image";
import type { NewsCategory } from "@prisma/client";
import {
  ArrowRight,
  Boxes,
  Landmark,
  Layers,
  LockKeyhole,
  PackageCheck,
  Percent,
  Search,
  ShieldCheck,
  Store,
  Swords,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { GAME_LIST, type GameMeta } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Reveal } from "@/components/Reveal";
import { NewsSlider, type NewsSlide } from "@/components/NewsSlider";

export const revalidate = 60;

const HERO_CARDS = [
  {
    src: "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    alt: "Carta de Magic",
    rot: "-12deg",
    lift: "mt-10",
  },
  {
    src: "https://api.myl.cl/static/cards/44/001.png",
    alt: "Carta de Mitos y Leyendas",
    rot: "-6deg",
    lift: "mt-3",
  },
  {
    src: "https://static.dotgg.gg/onepiece/card/OP01-001.webp",
    alt: "Carta de One Piece",
    rot: "0deg",
    lift: "-mt-4 scale-110 z-10",
  },
  {
    src: "https://assets.tcgdex.net/en/pl/pl4/1/high.webp",
    alt: "Carta de Pokémon",
    rot: "6deg",
    lift: "mt-3",
  },
  {
    src: "https://cards.scryfall.io/normal/front/9/1/91fdb56b-54d5-4272-8319-505ff987fe9b.jpg",
    alt: "Carta de Magic",
    rot: "12deg",
    lift: "mt-10",
  },
];

const TYPE_TILES: Array<{
  href: string;
  title: string;
  text: string;
  icon: LucideIcon;
}> = [
  {
    href: "/cartas?type=SINGLE",
    title: "Singles",
    text: "La carta exacta que buscas, con foto real del catálogo oficial.",
    icon: Layers,
  },
  {
    href: "/cartas?type=SEALED",
    title: "Sellados",
    text: "Sobres, displays y cajas sin abrir.",
    icon: Boxes,
  },
  {
    href: "/cartas?type=DECK",
    title: "Mazos armados",
    text: "Listos para jugar, con su lista carta por carta.",
    icon: Swords,
  },
];

const STEPS: Array<{ title: string; body: string; icon: LucideIcon }> = [
  {
    title: "Elige tus cartas",
    body: "Filtra por juego, estado, idioma y precio. Cada publicación muestra la imagen real del catálogo.",
    icon: Search,
  },
  {
    title: "Reservamos tu stock",
    body: "Al confirmar, las cartas quedan apartadas para ti. Nadie más puede comprarlas mientras pagas.",
    icon: LockKeyhole,
  },
  {
    title: "Paga con referencia",
    body: "Transfieres a la cuenta del vendedor con tu código único y subes el comprobante en un clic.",
    icon: Landmark,
  },
  {
    title: "Recibe tu pedido",
    body: "El vendedor confirma el pago y despacha a todo Chile con seguimiento, o coordinas el retiro.",
    icon: PackageCheck,
  },
];

export default async function HomePage() {
  const [byGame, latest, decks, sealed, sellers, counts, news, settings] = await Promise.all([
    // Se pide el top de cada juego por separado — si se pidiera un único top
    // global, un juego con muchas publicaciones (ej. Magic) desplazaría por
    // completo a los juegos con pocas, que quedarían sin mostrarse nunca.
    Promise.all(
      GAME_LIST.map((g) =>
        safeQuery(
          () =>
            prisma.listing.findMany({
              where: { status: "ACTIVE", stock: { gt: 0 }, game: g.id },
              select: LISTING_CARD_SELECT,
              orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
              take: 6,
            }),
          [] as ListingCardData[]
        )
      )
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: { status: "ACTIVE", stock: { gt: 0 } },
          select: LISTING_CARD_SELECT,
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
      [] as ListingCardData[]
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: { status: "ACTIVE", type: "DECK", stock: { gt: 0 } },
          select: LISTING_CARD_SELECT,
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      [] as ListingCardData[]
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: { status: "ACTIVE", type: "SEALED", stock: { gt: 0 } },
          select: LISTING_CARD_SELECT,
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      [] as ListingCardData[]
    ),
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { active: true },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            _count: { select: { listings: true } },
          },
          take: 8,
        }),
      [] as Array<{
        id: string;
        name: string;
        slug: string;
        city: string | null;
        _count: { listings: number };
      }>
    ),
    safeQuery(
      () =>
        prisma.listing.groupBy({
          by: ["game"],
          where: { status: "ACTIVE" },
          _count: { _all: true },
        }),
      [] as Array<{ game: string; _count: { _all: number } }>
    ),
    fetchHomeNews(),
    getSiteSettings(),
  ]);

  const newsSlides: NewsSlide[] = shuffle(news).map((n) => ({
    ...n,
    publishedAt: n.publishedAt.toISOString(),
  }));

  const countByGame = new Map(counts.map((c) => [c.game, c._count._all]));
  const totalListings = counts.reduce((a, c) => a + c._count._all, 0);
  const transferPct = discountPctFor(settings, "TRANSFER");

  return (
    <>
      {/* HERO */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="animate-blob pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
        <div
          className="animate-blob pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-gold-500/20 blur-3xl"
          style={{ animationDelay: "-6s" }}
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div>
            <span className="animate-fade-up glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" />
              Marketplace TCG de Chile
            </span>

            <h1 className="animate-fade-up delay-1 mt-6 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Las cartas que
              <br />
              te hacen <span className="text-gold-gradient">ganar</span>.
            </h1>

            <p className="animate-fade-up delay-2 mt-6 max-w-xl text-[16px] leading-relaxed text-white/70">
              Singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas. Compras con
              stock reservado, pagas por transferencia con referencia única y recibes en todo Chile.
            </p>

            {/* Buscador principal */}
            <form
              action="/cartas"
              method="get"
              role="search"
              className="animate-fade-up delay-3 relative mt-8 max-w-xl"
            >
              <Search
                className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50"
                strokeWidth={2}
              />
              <input
                name="q"
                placeholder="Busca Charizard, Sol Ring, Luffy…"
                aria-label="Buscar cartas"
                enterKeyHint="search"
                className="h-14 w-full rounded-full border border-white/15 bg-white/10 pl-13 pr-32 text-[15px] text-white placeholder:text-white/45 outline-none backdrop-blur-xl transition focus:border-gold-400/70 focus:bg-white/15 focus:shadow-[0_0_0_5px_rgba(230,185,74,0.18)]"
              />
              <button
                type="submit"
                className="btn btn-gold absolute right-1.5 top-1/2 h-11 -translate-y-1/2 !rounded-full !px-6"
              >
                Buscar
              </button>
            </form>

            <div className="animate-fade-up delay-4 mt-4 flex flex-wrap gap-2">
              {GAME_LIST.map((g) => (
                <Link
                  key={g.id}
                  href={`/cartas?game=${g.id}`}
                  className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[12px] font-semibold text-white/80 transition hover:border-gold-400/60 hover:bg-white/15 hover:text-white"
                >
                  {g.short}
                </Link>
              ))}
            </div>

            <dl className="animate-fade-up delay-4 mt-10 flex flex-wrap gap-x-10 gap-y-5">
              {[
                [String(GAME_LIST.length), "Juegos"],
                [String(totalListings), "Publicaciones"],
                [transferPct > 0 ? `${transferPct}%` : "0%", "Dcto. transferencia"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl font-bold text-white">{value}</dt>
                  <dd className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Abanico de cartas */}
          <div className="relative">
            <div className="relative flex h-[300px] items-center justify-center sm:h-[420px]">
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-40 -translate-y-1/2 rounded-full bg-brand-500/30 blur-3xl" />
              {HERO_CARDS.map((c, i) => (
                <div
                  key={c.src}
                  className={`animate-float card-tilt tcg-card-shadow relative -ml-12 w-[100px] shrink-0 overflow-hidden rounded-xl border border-white/20 first:ml-0 sm:-ml-16 sm:w-[150px] lg:w-[168px] ${c.lift}`}
                  style={
                    {
                      "--rot": c.rot,
                      transform: `rotate(${c.rot})`,
                      animationDelay: `${i * 0.5}s`,
                    } as React.CSSProperties
                  }
                >
                  <Image
                    src={c.src}
                    alt={c.alt}
                    width={252}
                    height={352}
                    sizes="(max-width:640px) 100px, 168px"
                    className="h-auto w-full"
                    priority={i === 2}
                    unoptimized
                  />
                </div>
              ))}
            </div>

            <div
              className="animate-float glass absolute -left-1 top-2 hidden items-center gap-2.5 rounded-2xl px-4 py-3 sm:flex"
              style={{ animationDelay: "-2s" }}
            >
              <LockKeyhole className="h-5 w-5 text-gold-300" strokeWidth={1.75} />
              <div>
                <p className="text-[12px] font-bold">Stock reservado</p>
                <p className="text-[11px] text-white/55">Apartamos tu compra</p>
              </div>
            </div>
            <div
              className="animate-float glass absolute -right-1 bottom-4 hidden items-center gap-2.5 rounded-2xl px-4 py-3 sm:flex"
              style={{ animationDelay: "-4s" }}
            >
              <Percent className="h-5 w-5 text-gold-300" strokeWidth={1.75} />
              <div>
                <p className="text-[12px] font-bold">
                  {transferPct > 0 ? `${transferPct}% por transferencia` : "Pago por transferencia"}
                </p>
                <p className="text-[11px] text-white/55">Con código de referencia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cinta de juegos */}
        <div className="marquee relative overflow-hidden border-t border-white/10 bg-black/20 py-4">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
                {[...GAME_LIST, ...GAME_LIST, ...GAME_LIST].map((g, i) => (
                  <span
                    key={`${g.id}-${i}`}
                    className="flex items-center gap-8 px-8 text-[13px] font-bold uppercase tracking-[0.2em] text-white/40"
                  >
                    {g.name}
                    <span className="h-1 w-1 rounded-full bg-gold-400/70" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JUEGOS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle
          eyebrow="Explora"
          title="Elige tu TCG favorito"
          subtitle="Cada juego con su catálogo, imágenes y filtros propios"
        />
        <Reveal className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_LIST.map((g) => (
            <GameTile key={g.id} game={g} count={countByGame.get(g.id) ?? 0} />
          ))}
        </Reveal>

        <Reveal className="stagger mt-4 grid gap-4 md:grid-cols-3">
          {TYPE_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group lift flex items-start gap-4 rounded-2xl card-surface p-5"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-carbon text-gold-300 transition group-hover:scale-105 group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-6 w-6" strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-display text-[16px] font-bold text-carbon">
                    {t.title}
                    <ArrowRight
                      className="h-4 w-4 text-ink-500 transition group-hover:translate-x-1 group-hover:text-brand-600"
                      strokeWidth={2}
                    />
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-ink-400">
                    {t.text}
                  </span>
                </span>
              </Link>
            );
          })}
        </Reveal>
      </section>

      {/* RECIÉN LLEGADOS */}
      {latest.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-6">
          <SectionTitle
            eyebrow="Novedades"
            title="Recién llegados"
            subtitle="Lo último que publicaron nuestros vendedores"
            href="/cartas"
          />
          <div className="no-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-4">
            {latest.map((l) => (
              <div key={l.id} className="w-[46vw] shrink-0 snap-start sm:w-[220px]">
                <ListingCard listing={l} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* POR JUEGO */}
      {GAME_LIST.map((g, i) => {
        const items = byGame[i];
        if (items.length === 0) return null;
        return (
          <GameShowcase
            key={g.id}
            game={g}
            listings={items}
            total={countByGame.get(g.id) ?? items.length}
          />
        );
      })}

      {/* MAZOS */}
      {decks.length > 0 && (
        <Showcase
          eyebrow="Listos para jugar"
          title="Mazos armados"
          subtitle="Decks completos con su lista de cartas carta por carta"
          href="/cartas?type=DECK"
          listings={decks}
        />
      )}

      {/* SELLADOS */}
      {sealed.length > 0 && (
        <Showcase
          eyebrow="Sin abrir"
          title="Producto sellado"
          subtitle="Sobres, displays y cajas sin abrir"
          href="/cartas?type=SEALED"
          listings={sealed}
        />
      )}

      {/* PAGO SEGURO */}
      <section className="relative mt-10 overflow-hidden bg-carbon py-20 text-white">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-600/25 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-gold-300">
              Compra protegida
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Así funciona cada compra en Win Condition
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              Un proceso claro de principio a fin: tus cartas apartadas, un pago identificable y un
              vendedor que confirma antes de despachar.
            </p>
          </div>

          <Reveal className="stagger mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="glass group relative rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/10"
                >
                  <span className="absolute right-5 top-4 font-display text-5xl font-bold text-white/[0.06]">
                    {i + 1}
                  </span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-[#2a1d00]">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-5 font-display text-[16px] font-bold">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/60">{s.body}</p>
                </div>
              );
            })}
          </Reveal>

          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3 text-[13px] font-semibold text-white/70">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold-300" strokeWidth={2} />
              Comprobante solo visible para las partes
            </span>
            <span className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold-300" strokeWidth={2} />
              Envíos a todo Chile
            </span>
            {transferPct > 0 && (
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-gold-300" strokeWidth={2} />
                {transferPct}% de descuento pagando por transferencia
              </span>
            )}
          </div>
        </div>
      </section>

      {/* NOTICIAS */}
      {newsSlides.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16">
          <SectionTitle
            eyebrow="Actualidad"
            title="Noticias y torneos"
            subtitle="Lo último de Magic, Pokémon y One Piece"
            href="/noticias"
          />
          <div className="mt-8">
            <NewsSlider items={newsSlides} />
          </div>
        </section>
      )}

      {/* VENDEDORES */}
      {sellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16">
          <SectionTitle
            eyebrow="Comunidad"
            title="Vendedores de Win Condition"
            subtitle="Tiendas y coleccionistas de todo Chile"
            href="/vendedores"
          />
          <Reveal className="stagger mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={`/vendedor/${s.slug}`}
                className="group lift flex items-center gap-3.5 rounded-2xl card-surface p-4"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-white">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-bold text-carbon">{s.name}</span>
                  <span className="block truncate text-[12px] text-ink-400">
                    {s._count.listings} publicaciones
                    {s.city ? ` · ${s.city}` : ""}
                  </span>
                </span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-ink-500 transition group-hover:translate-x-1 group-hover:text-brand-600"
                  strokeWidth={2}
                />
              </Link>
            ))}
          </Reveal>
        </section>
      )}

      {/* CTA VENDEDORES */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="bg-hero relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:px-14">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-[#2a1d00]">
              <Store className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              ¿Tienes cartas para vender?
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Publica singles, sellados y mazos en minutos. Cobras por transferencia directa a tu
              cuenta y nosotros reservamos el stock por ti.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/registro" className="btn btn-gold btn-lg">
                Crear mi cuenta
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Link href="/vendedores" className="btn btn-glass btn-lg">
                Ver vendedores
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
  href,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-carbon sm:text-[2rem]">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-[14px] text-ink-400">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Ver todo
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

function GameTile({ game, count }: { game: GameMeta; count: number }) {
  return (
    <Link
      href={`/cartas?game=${game.id}`}
      className="group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl bg-carbon"
    >
      <Image
        src={game.artImage ?? game.cardImage}
        alt=""
        fill
        sizes="(max-width:640px) 100vw, 320px"
        className={`object-cover opacity-80 transition duration-700 group-hover:scale-110 group-hover:opacity-100 ${
          game.artImage ? "" : "object-[center_12%]"
        }`}
        unoptimized
      />
      <span className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/55 to-transparent" />
      <span
        className="absolute inset-x-0 top-0 h-1 opacity-0 transition group-hover:opacity-100"
        style={{ background: game.accent }}
      />

      <span className="relative p-5">
        <span className="block font-display text-2xl font-bold leading-tight text-white">
          {game.short}
        </span>
        <span className="mt-1 block text-[12px] text-white/65">{game.tagline}</span>
        <span className="mt-4 flex items-center justify-between">
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
            {count} {count === 1 ? "publicación" : "publicaciones"}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-carbon transition group-hover:bg-gold-300">
            <ArrowRight
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </span>
        </span>
      </span>
    </Link>
  );
}

function Showcase({
  eyebrow,
  title,
  subtitle,
  href,
  listings,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  href: string;
  listings: ListingCardData[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <SectionTitle eyebrow={eyebrow} title={title} subtitle={subtitle} href={href} />
      <Reveal className="stagger mt-8 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </Reveal>
    </section>
  );
}

/** Fila propia para cada juego, con su nombre, su color y su enlace al catálogo. */
function GameShowcase({
  game,
  listings,
  total,
}: {
  game: GameMeta;
  listings: ListingCardData[];
  total: number;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <span
            className="h-11 w-1.5 rounded-full"
            style={{ background: game.accent }}
            aria-hidden="true"
          />
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-carbon sm:text-[1.75rem]">
              {game.name}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-400">
              {total} {total === 1 ? "publicación" : "publicaciones"} · {game.tagline}
            </p>
          </div>
        </div>
        <Link
          href={`/cartas?game=${game.id}`}
          className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Ver todo {game.short}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2} />
        </Link>
      </div>

      <Reveal className="stagger grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </Reveal>
    </section>
  );
}

type HomeNewsItem = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: Date;
};

const HOME_NEWS_SELECT = {
  id: true,
  category: true,
  title: true,
  excerpt: true,
  imageUrl: true,
  sourceName: true,
  publishedAt: true,
} as const;

/**
 * One Piece y Pokémon son las prioridades de la tienda, pero Magic publica
 * mucho más seguido (MTGGoldfish es casi diario) y si se ordenara todo por
 * fecha terminaría copando el slider. Por eso se arma el pool por categoría
 * con cupos fijos en vez de un solo `findMany` ordenado por fecha.
 */
async function fetchHomeNews(): Promise<HomeNewsItem[]> {
  const quotas: Array<{ category: NewsCategory; take: number }> = [
    { category: "ONEPIECE", take: 4 },
    { category: "POKEMON", take: 4 },
    { category: "MAGIC", take: 2 },
    { category: "MYL", take: 2 },
    { category: "GENERAL", take: 1 },
  ];

  const groups = await Promise.all(
    quotas.map(({ category, take }) =>
      safeQuery(
        () =>
          prisma.newsItem.findMany({
            where: { category },
            orderBy: { publishedAt: "desc" },
            take,
            select: HOME_NEWS_SELECT,
          }),
        [] as HomeNewsItem[]
      )
    )
  );

  return groups.flat();
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
