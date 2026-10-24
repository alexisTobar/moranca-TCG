import { homeNews } from "@/lib/news/query";
import Link from "next/link";
import type { Metadata } from "next";
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
import { GAME_LIST, GAMES, type GameMeta } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Reveal } from "@/components/Reveal";
import { HeroCards } from "@/components/HeroCards";
import { NewsSlider, type NewsSlide } from "@/components/NewsSlider";
import { GameLogo } from "@/components/GameLogo";
import { StoreShowcase } from "@/components/store/StoreShowcase";
import { PlanCards } from "@/components/store/PlanCards";
import { FaqList, faqJsonLd, type FaqItem } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";
import { getMarketingPlans } from "@/lib/store-marketing";
import { SITE_NAME, siteUrl } from "@/lib/seo";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Win Condition TCG | Compra y vende cartas TCG en Chile" },
  description:
    "Marketplace chileno de cartas TCG: singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas. Stock reservado, pago por transferencia y envíos a todo Chile.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Win Condition TCG | Compra y vende cartas TCG en Chile",
    description: "Singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas. Stock reservado y envíos a todo Chile.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Win Condition TCG — cartas TCG en Chile" }],
  },
  twitter: { card: "summary_large_image" },
};

/** Una carta destacada por juego (todas caras o raras y de ediciones actuales). */
const HERO_CARDS: Array<{
  game: "magic" | "pokemon" | "onepiece" | "myl";
  src: string;
  alt: string;
  name: string;
  detail: string;
}> = [
  {
    game: "magic",
    src: "https://cards.scryfall.io/large/front/e/f/ef371352-ec8f-4da4-9085-67195068fb79.jpg",
    alt: "Emeritus of Ideation // Ancestral Recall, carta de Magic",
    name: "Ancestral Recall",
    detail: "Secrets of Strixhaven",
  },
  {
    game: "pokemon",
    src: "https://assets.tcgdex.net/en/me/me02.5/276/high.webp",
    alt: "Pikachu ex, carta de Pokémon",
    name: "Pikachu ex",
    detail: "Ascended Heroes",
  },
  {
    game: "onepiece",
    src: "https://static.dotgg.gg/onepiece/card/OP05-119.webp",
    alt: "Monkey D. Luffy Gear 5, carta de One Piece",
    name: "Monkey D. Luffy",
    detail: "Gear 5 · OP-05",
  },
  {
    game: "myl",
    src: "https://api.myl.cl/static/cards/166/018.png",
    alt: "Guerra Celestial, carta legendaria de Mitos y Leyendas",
    name: "Guerra Celestial",
    detail: "AyD Vigilantes",
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
  { href: "/cartas?type=ACCESSORY", title: "Accesorios", text: "Protectores, portamazos, tapetes y todo para tu colección.", icon: Boxes },
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
  const [byGame, latest, decks, sealed, accessories, sellers, counts, news, settings] = await Promise.all([
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
    safeQuery(() => prisma.listing.findMany({
      where: { status: "ACTIVE", type: "ACCESSORY", stock: { gt: 0 } },
      select: LISTING_CARD_SELECT, orderBy: { createdAt: "desc" }, take: 6,
    }), [] as ListingCardData[]),
    safeQuery(
      () =>
        prisma.user.findMany({
          where: { active: true, role: { in: ["SELLER", "ADMIN"] } },
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
    safeQuery(() => homeNews(), []),
    getSiteSettings(),
  ]);

  const newsSlides: NewsSlide[] = news.map((n) => ({
    ...n,
    publishedAt: n.publishedAt.toISOString(),
    eventAt: n.eventAt?.toISOString() ?? null,
  }));

  const countByGame = new Map(counts.map((c) => [c.game, c._count._all]));
  const transferPct = discountPctFor(settings, "TRANSFER");
  const plans = await getMarketingPlans();

  const faqs: FaqItem[] = [
    {
      q: "¿Cómo compro cartas en Win Condition TCG?",
      a: "Buscas la carta, la agregas al carrito y confirmas la compra. Reservamos el stock a tu nombre, transfieres al vendedor con tu código único y subes el comprobante. El vendedor confirma el pago y despacha tu pedido.",
    },
    {
      q: "¿Cómo se paga y es seguro?",
      a: `El pago es por transferencia bancaria directa al vendedor. Cada orden tiene un código de referencia único y un comprobante privado, y tu stock queda reservado por ${settings.paymentWindowHours} horas mientras pagas. Si no pagas a tiempo, la orden se cancela y las cartas vuelven a estar disponibles.`,
    },
    {
      q: "¿Hacen envíos a todo Chile?",
      a: "Sí. Cada vendedor indica si ofrece envío a domicilio, retiro en persona o ambos, y puedes filtrar por la opción que prefieras o por vendedores cerca de tu región.",
    },
    {
      q: "¿Qué juegos y productos puedo encontrar?",
      a: "Singles, sellados y mazos armados de Magic: The Gathering, Pokémon TCG, One Piece Card Game y Mitos y Leyendas, con la imagen real del catálogo oficial y comparación de precios entre vendedores.",
    },
    {
      q: "¿Cómo puedo vender mis cartas?",
      a: "Crea tu cuenta, solicita ser vendedor y publica tus cartas. Puedes cargar listas completas de Magic, Pokémon y One Piece de una sola vez. Cobras directo a tu cuenta y tienes un perfil con link y QR para compartir.",
    },
    {
      q: "¿Qué es una tienda premium?",
      a: "Es tu propia vitrina dentro de Win Condition: con tu logo, banner y colores, solo tus productos, link corto y QR con tu logo, estadísticas y soporte directo. Conoce los planes en la página de tiendas.",
    },
  ];

  return (
    <div className="editorial-home">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: siteUrl(),
            logo: `${siteUrl()}/logo-full.png`,
            description: "Marketplace chileno de cartas coleccionables TCG.",
            areaServed: "CL",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: siteUrl(),
            inLanguage: "es-CL",
            potentialAction: {
              "@type": "SearchAction",
              target: { "@type": "EntryPoint", urlTemplate: `${siteUrl()}/cartas?q={search_term_string}` },
              "query-input": "required name=search_term_string",
            },
          },
          faqJsonLd(faqs),
        ]}
      />
      <section className="editorial-hero">
        <div className="home-stage max-w-7xl">
          <div className="home-copy">
            <h1>La carta que falta.<br/><em>La jugada que viene.</em></h1>
            <p>Tu próximo mazo empieza aquí. Compara cartas de tiendas y coleccionistas de todo Chile y encuentra tu mejor jugada.</p>
            <form action="/cartas" className="editorial-search">
              <Search size={20} aria-hidden="true"/><label htmlFor="hero-query" className="sr-only">Buscar cartas</label>
              <input id="hero-query" name="q" type="search" placeholder="¿Qué carta estás buscando?" maxLength={120}/>
              <button type="submit">Buscar <ArrowRight size={17}/></button>
            </form>
            <nav className="home-categories" aria-label="Tipo de producto"><Link href="/cartas">Cartas <ArrowRight size={16}/></Link><Link href="/cartas?type=SEALED">Sellados <ArrowRight size={16}/></Link><Link href="/cartas?type=DECK">Mazos <ArrowRight size={16}/></Link><Link href="/cartas?type=ACCESSORY">Accesorios <ArrowRight size={16}/></Link></nav>
            <Link className="home-local-link" href="/explorar"><Store size={18}/> Encuentra tiendas cerca de ti <ArrowRight size={17}/></Link>
          </div>
          <div className="home-card-stage"><HeroCards cards={HERO_CARDS}/></div>
        </div>
      </section>
      <section className="home-discovery max-w-7xl" aria-labelledby="nearby-title"><div><h2 id="nearby-title">Tu comunidad también juega cerca.</h2><p>Explora Chile por región y comuna. Descubre vendedores, sus juegos y el stock disponible.</p></div><Link href="/explorar">Buscar tiendas en el mapa <ArrowRight size={20}/></Link></section>
      {/* JUEGOS */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <SectionTitle
          eyebrow="Explora"
          title="Elige tu TCG favorito"
          subtitle="Cada juego con su catálogo, imágenes y filtros propios"
        />
        <Reveal className="stagger mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {GAME_LIST.map((g) => (
            <GameTile key={g.id} game={g} count={countByGame.get(g.id) ?? 0} />
          ))}
        </Reveal>

        <Reveal className="stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TYPE_TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group flex items-start gap-4 border-b border-ink-700 py-5"
              >
                <span className="flex h-10 w-8 shrink-0 items-center justify-center text-ink-300">
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

      {accessories.length > 0 && <Showcase eyebrow="" title="Accesorios" subtitle="Protectores, portamazos, tapetes y más" href="/cartas?type=ACCESSORY" listings={accessories} />}

      <section className="editorial-process mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl">Así funciona cada compra en Win Condition</h2>
        <p className="mt-4 max-w-2xl text-sm text-ink-400">Tus cartas apartadas, un pago identificable y un vendedor que confirma antes de despachar.</p>
        <ol>{STEPS.map((step, i) => <li key={step.title}><span aria-hidden="true">{i + 1}</span><div><h3>{step.title}</h3><p>{step.body}</p></div></li>)}</ol>
        <p className="mt-5 text-sm text-ink-400">Comprobante solo visible para las partes · Envíos a todo Chile{transferPct > 0 ? ` · ${transferPct}% de descuento pagando por transferencia` : ""}</p>
      </section>
      {/* NOTICIAS */}
      {newsSlides.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16">
          <SectionTitle
            eyebrow="Actualidad"
            title="Noticias y torneos"
            subtitle="Chile primero: torneos, comunidad y lanzamientos de Pokémon y One Piece, en español"
            href="/noticias"
          />
          <div className="mt-8">
            <NewsSlider items={newsSlides} />
          </div>
        </section>
      )}

      <StoreShowcase />

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

      {/* TU TIENDA: planes */}
      <section id="tu-tienda" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-16">
        <div className="light-promo relative overflow-hidden rounded-[2rem] px-5 py-14 text-white sm:px-12 lg:py-16">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="animate-blob pointer-events-none absolute -right-16 -top-10 h-64 w-64 rounded-full bg-gold-500/15 blur-3xl" />
          <div className="relative">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Tu tienda propia, con tu marca al frente
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/65">
                Vende gratis con tu perfil o da el salto con una tienda premium: link corto, QR con tu logo, banner,
                colores, estadísticas y soporte directo. Sin comisiones por venta, sin dominio propio y sin renovación automática.
              </p>
            </div>

            <div className="mt-10">
              <PlanCards plans={plans} ctaHref="/tiendas#planes" ctaLabel="Quiero este plan" tone="dark" />
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/tiendas" className="btn btn-gold btn-lg">
                Conocer las tiendas
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Link href="/registro" className="btn btn-glass btn-lg">
                Crear mi cuenta gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="mx-auto max-w-7xl px-4 pt-16">
        <SectionTitle eyebrow="Ayuda" title="Preguntas frecuentes" subtitle="Lo que más nos preguntan compradores y vendedores" />
        <div className="mt-8">
          <FaqList items={faqs} />
        </div>
      </section>
    </div>
  );
}

function SectionTitle({
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
      className="group relative isolate flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-3xl bg-carbon p-3 sm:aspect-[4/5] sm:p-5"
    >
      <Image
        src={game.artImage ?? game.cardImage}
        alt=""
        fill
        sizes="(max-width:640px) 100vw, 320px"
        className={`-z-10 object-cover opacity-90 transition duration-700 group-hover:scale-110 group-hover:opacity-100 ${
          game.artImage ? "" : "object-[center_10%]"
        }`}
        unoptimized
      />
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-carbon via-carbon/40 to-carbon/10" />
      <span
        className="absolute inset-x-0 top-0 -z-10 h-1 opacity-0 transition group-hover:opacity-100"
        style={{ background: game.accent }}
      />

      <GameLogo game={game.id} size="tile" />

      <span className="block">
        <span className="block font-display text-[13px] font-bold leading-snug text-white sm:text-xl">
          {game.tagline}
        </span>
        <span className="mt-3 flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur sm:px-3 sm:text-[11px]">
            {count} {count === 1 ? "publicación" : "publicaciones"}
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-carbon transition group-hover:bg-gold-300">
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

/** Fila de productos: carrusel con desplazamiento en móvil, grilla en pantallas grandes. */
function ProductRow({ listings }: { listings: ListingCardData[] }) {
  return (
    <Reveal className="stagger no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
      {listings.map((l) => (
        <div key={l.id} className="w-[46vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
          <ListingCard listing={l} />
        </div>
      ))}
    </Reveal>
  );
}

function Showcase({
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
    <section className="mx-auto max-w-7xl px-4 py-8">
      <SectionTitle title={title} subtitle={subtitle} href={href} />
      <div className="mt-7">
        <ProductRow listings={listings} />
      </div>
    </section>
  );
}

/** Sección de un juego: su logo oficial (mismo tamaño para todos), un fondo con su color y sus productos. */
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
    <section className="mx-auto max-w-7xl px-4 py-5">
      <div
        className="overflow-hidden rounded-[2rem] border border-ink-800 p-5 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <GameLogo game={game.id} size="lg" />
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold leading-tight tracking-tight text-carbon sm:text-2xl">
                {game.tagline}
              </h2>
              <p className="mt-1 text-[13px] text-ink-400">
                {total} {total === 1 ? "publicación disponible" : "publicaciones disponibles"}
              </p>
            </div>
          </div>
          <Link href={`/cartas?game=${game.id}`} className="btn btn-secondary btn-sm self-start sm:self-auto">
            Ver todo {game.short}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>

        <div className="mt-6">
          <ProductRow listings={listings} />
        </div>
      </div>
    </section>
  );
}
