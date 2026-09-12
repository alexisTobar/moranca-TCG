import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { GAME_LIST, type GameMeta } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { Search, ShieldCheck, PackageCheck, type LucideIcon } from "lucide-react";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Reveal } from "@/components/Reveal";
import { NewsSlider, type NewsSlide } from "@/components/NewsSlider";

export const revalidate = 60;

const HERO_CARDS = [
  {
    src: "https://cards.scryfall.io/normal/front/b/d/bd8fa327-dd41-4737-8f19-2cf5eb1f7cdd.jpg",
    alt: "Carta de Magic",
    rot: "-14deg",
    z: "z-10",
    extra: "translate-y-6",
  },
  {
    src: "https://api.myl.cl/static/cards/44/001.png",
    alt: "Carta de Mitos y Leyendas",
    rot: "-7deg",
    z: "z-20",
    extra: "translate-y-2",
  },
  {
    src: "https://static.dotgg.gg/onepiece/card/OP01-001.webp",
    alt: "Carta de One Piece",
    rot: "0deg",
    z: "z-30",
    extra: "",
  },
  {
    src: "https://assets.tcgdex.net/en/pl/pl4/1/high.webp",
    alt: "Carta de Pokémon",
    rot: "7deg",
    z: "z-20",
    extra: "translate-y-2",
  },
  {
    src: "https://cards.scryfall.io/normal/front/9/1/91fdb56b-54d5-4272-8319-505ff987fe9b.jpg",
    alt: "Carta de Magic",
    rot: "14deg",
    z: "z-10",
    extra: "translate-y-6",
  },
];

const STEPS: Array<{ title: string; body: string; icon: LucideIcon }> = [
  {
    title: "Elige tus cartas",
    body: "Filtra por juego, estado, idioma y precio. Cada publicación muestra la imagen real desde el catálogo oficial.",
    icon: Search,
  },
  {
    title: "Paga protegido",
    body: "Checkout con Mercado Pago: tarjetas, débito y transferencia. Tu dinero queda resguardado hasta la entrega.",
    icon: ShieldCheck,
  },
  {
    title: "Recibe en casa",
    body: "Despacho a todo Chile con seguimiento, o retiro coordinado con el vendedor.",
    icon: PackageCheck,
  },
];

export default async function HomePage() {
  const [byGame, decks, sealed, sellers, counts, news] = await Promise.all([
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
    safeQuery(
      () =>
        prisma.newsItem.findMany({
          orderBy: { publishedAt: "desc" },
          take: 8,
          select: {
            id: true,
            category: true,
            title: true,
            excerpt: true,
            imageUrl: true,
            sourceName: true,
            publishedAt: true,
          },
        }),
      [] as Array<{
        id: string;
        category: string;
        title: string;
        excerpt: string;
        imageUrl: string | null;
        sourceName: string;
        publishedAt: Date;
      }>
    ),
  ]);

  const newsSlides: NewsSlide[] = news.map((n) => ({
    ...n,
    publishedAt: n.publishedAt.toISOString(),
  }));

  const countByGame = new Map(counts.map((c) => [c.game, c._count._all]));

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-ink-800">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-pulse-slow absolute left-1/2 top-[-20%] h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-accent-500/10 blur-[130px]" />
          <div
            className="animate-pulse-slow absolute right-[-10%] bottom-[-30%] h-[420px] w-[420px] rounded-full bg-brand-500/12 blur-[120px]"
            style={{ animationDelay: "3s" }}
          />
          <Image
            src="/logo-mark.png"
            alt=""
            width={720}
            height={293}
            className="absolute left-0 top-1/2 hidden h-[520px] w-auto -translate-x-1/2 -translate-y-1/2 -rotate-12 select-none opacity-[0.06] sm:block"
            unoptimized
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent-300">
              Tienda chilena de cartas
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] text-carbon sm:text-5xl lg:text-6xl">
              Compra y vende cartas
              <br />
              <span className="brand-text">de forma segura</span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-300">
              Singles, sobres sellados y mazos armados de{" "}
              <strong className="font-semibold text-ink-200">Magic</strong>,{" "}
              <strong className="font-semibold text-ink-200">Pokémon</strong>,{" "}
              <strong className="font-semibold text-ink-200">One Piece</strong> y{" "}
              <strong className="font-semibold text-ink-200">Mitos y Leyendas</strong>.
              Imágenes oficiales, precios en pesos y despacho a todo Chile.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cartas"
                className="hover-pop rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 hover:shadow-[0_10px_30px_-10px_rgba(217,164,65,0.7)]"
              >
                Explorar catálogo
              </Link>
              <Link
                href="/cartas?type=DECK"
                className="hover-pop rounded-xl border border-ink-600 px-6 py-3 text-sm font-semibold text-ink-200 transition hover:border-accent-500/60 hover:text-accent-300"
              >
                Ver mazos armados
              </Link>
            </div>

            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
              {[
                ["4", "Juegos soportados"],
                [
                  String(counts.reduce((a, c) => a + c._count._all, 0)),
                  "Publicaciones activas",
                ],
                ["100%", "Pago protegido"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-bold text-accent-400">
                    {value}
                  </dt>
                  <dd className="text-[11px] uppercase tracking-wider text-ink-400">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden h-[340px] items-center justify-center lg:flex">
            {HERO_CARDS.map((c, i) => (
              <div
                key={c.src}
                className={`animate-float absolute ${c.z} ${c.extra} tcg-card-shadow overflow-hidden rounded-xl border border-ink-700`}
                style={
                  {
                    "--rot": c.rot,
                    transform: `rotate(${c.rot})`,
                    left: `${8 + i * 19}%`,
                    animationDelay: `${i * 0.4}s`,
                  } as React.CSSProperties
                }
              >
                <Image
                  src={c.src}
                  alt={c.alt}
                  width={172}
                  height={240}
                  className="h-[240px] w-[172px] object-cover"
                  priority={i === 2}
                  unoptimized
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTICIAS */}
      {newsSlides.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14">
          <SectionTitle
            title="Noticias y torneos"
            subtitle="Lo último de Magic, Pokémon y One Piece"
            href="/noticias"
          />
          <div className="mt-6">
            <NewsSlider items={newsSlides} />
          </div>
        </section>
      )}

      {/* JUEGOS */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <SectionTitle
          title="Explora tu TCG favorito"
          subtitle="Cada juego con su catálogo, imágenes y buscador propio"
        />
        <Reveal className="stagger mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GAME_LIST.map((g) => (
            <Link
              key={g.id}
              href={`/cartas?game=${g.id}`}
              className="group overflow-hidden rounded-2xl border border-ink-700 bg-white transition hover:-translate-y-1 hover:border-brand-500 hover:shadow-[0_18px_40px_-20px_rgba(29,78,216,0.45)]"
            >
              {/* Banner con arte real del juego */}
              <div
                className={`relative h-32 overflow-hidden bg-gradient-to-br ${g.gradient}`}
              >
                <Image
                  src={g.artImage ?? g.cardImage}
                  alt={g.name}
                  fill
                  sizes="(max-width:640px) 100vw, 320px"
                  className={`object-cover transition duration-500 group-hover:scale-105 ${
                    g.artImage ? "" : "object-[center_18%]"
                  }`}
                  unoptimized
                />
                <span className="absolute inset-0 bg-gradient-to-t from-white via-white/25 to-transparent" />

                {/* Carta flotante */}
                <span className="absolute -bottom-5 right-4 block h-24 w-[62px] overflow-hidden rounded-md border border-ink-700 bg-white shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                  <Image
                    src={g.cardImage}
                    alt=""
                    fill
                    sizes="62px"
                    className="object-cover"
                    unoptimized
                  />
                </span>
              </div>

              <div className="p-5 pt-3">
                <span
                  className="mb-2 inline-block h-1 w-8 rounded-full"
                  style={{ background: g.accent }}
                />
                <h3 className="sr-only">{g.short}</h3>
                <div className="relative h-9 w-full">
                  <Image
                    src={g.logo}
                    alt={g.name}
                    fill
                    sizes="180px"
                    className="object-contain object-left"
                    unoptimized
                  />
                </div>
                <p className="mt-2 text-[12px] text-ink-400">{g.tagline}</p>
                <p className="mt-4 text-[11px] uppercase tracking-widest text-ink-400">
                  {countByGame.get(g.id) ?? 0} publicaciones
                </p>
                <span className="mt-1 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600">
                  Ver cartas
                  <span className="transition group-hover:translate-x-1">→</span>
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* POR JUEGO — cada TCG con su propia fila */}
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
          title="Mazos armados"
          subtitle="Decks completos con su lista de cartas carta por carta"
          href="/cartas?type=DECK"
          listings={decks}
        />
      )}

      {/* SELLADOS */}
      {sealed.length > 0 && (
        <Showcase
          title="Producto sellado"
          subtitle="Sobres, displays y cajas sin abrir"
          href="/cartas?type=SEALED"
          listings={sealed}
        />
      )}

      {/* CÓMO FUNCIONA */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-3xl border border-ink-700 bg-ink-900/60 p-8 sm:p-12">
          <SectionTitle
            title="Comprar en Win Condition es simple"
            subtitle="Tres pasos y tus cartas van en camino"
          />
          <Reveal className="stagger mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className="hover-pop relative rounded-2xl card-surface p-6"
                >
                  <span className="absolute right-5 top-4 font-display text-4xl font-bold text-ink-800">
                    0{i + 1}
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <h3 className="mt-3 font-semibold text-carbon">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{s.body}</p>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* VENDEDORES */}
      {sellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <SectionTitle
            title="Vendedores de Win Condition"
            subtitle="Tiendas y coleccionistas verificados"
            href="/vendedores"
          />
          <Reveal className="stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {sellers.map((s) => (
              <Link
                key={s.id}
                href={`/vendedor/${s.slug}`}
                className="hover-pop flex items-center gap-3 rounded-xl card-surface p-4 transition hover:border-accent-500/50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-paper">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-200">
                    {s.name}
                  </span>
                  <span className="block text-[11px] text-ink-400">
                    {s._count.listings} publicaciones
                    {s.city ? ` · ${s.city}` : ""}
                  </span>
                </span>
              </Link>
            ))}
          </Reveal>
        </section>
      )}
    </>
  );
}

function SectionTitle({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-2xl font-bold text-carbon sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-[13px] text-ink-400">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="text-[13px] font-semibold text-accent-300 hover:text-accent-400"
        >
          Ver todo →
        </Link>
      )}
    </div>
  );
}

function Showcase({
  title,
  subtitle,
  href,
  listings,
}: {
  title: string;
  subtitle: string;
  href: string;
  listings: ListingCardData[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <SectionTitle title={title} subtitle={subtitle} href={href} />
      {listings.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-ink-700 p-12 text-center">
          <p className="text-sm text-ink-400">
            Aún no hay publicaciones en esta sección.
          </p>
          <Link
            href="/panel/publicar"
            className="mt-3 inline-block text-[13px] font-semibold text-accent-300 hover:text-accent-400"
          >
            Publicar la primera →
          </Link>
        </div>
      ) : (
        <Reveal className="stagger mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </Reveal>
      )}
    </section>
  );
}

/** Fila propia para cada juego, con su color, su carta y su enlace al catálogo. */
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
    <section className="border-t border-ink-800 bg-white py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span
            className="h-9 w-1.5 shrink-0 rounded-full"
            style={{ background: game.accent }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="sr-only">{game.short}</h2>
            <div className="relative h-7 w-32 sm:h-8 sm:w-40">
              <Image
                src={game.logo}
                alt={game.name}
                fill
                sizes="160px"
                className="object-contain object-left"
                unoptimized
              />
            </div>
            <p className="mt-1 text-[12px] text-ink-400">
              {total} {total === 1 ? "publicación" : "publicaciones"} · {game.tagline}
            </p>
          </div>
          <Link
            href={`/cartas?game=${game.id}`}
            className="rounded-lg border border-ink-700 px-4 py-2 text-[12px] font-semibold text-ink-300 transition hover:border-brand-500 hover:text-brand-600"
          >
            Ver todo {game.short} →
          </Link>
        </div>

        <Reveal className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
