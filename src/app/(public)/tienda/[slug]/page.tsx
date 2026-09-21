import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, Globe, MapPin, MessageCircle, SearchX, Star, Store, Truck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { GAME_LIST, isGameId } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { formatSales, getSellerStats } from "@/lib/seller-stats";
import { sellerRegion } from "@/lib/location";
import { ensureAdminPro, isStoreActive, recordStoreVisit, siteOrigin } from "@/lib/store";
import { storeLinks } from "@/lib/store-links";
import { storeThemeVars } from "@/lib/store-theme";
import { buildQr } from "@/lib/qr";
import { ShareQrCard } from "@/components/store/ShareQrCard";
import { ShareToggle } from "@/components/store/ShareToggle";
import { StoreHeader } from "@/components/store/StoreHeader";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const TYPES = [
  { value: "SINGLE", label: "Singles" },
  { value: "SEALED", label: "Sellados" },
  { value: "DECK", label: "Mazos" },
];
const SORTS: Record<string, { label: string; order: Prisma.ListingOrderByWithRelationInput }> = {
  recientes: { label: "Recientes", order: { createdAt: "desc" } },
  "precio-asc": { label: "Precio ↑", order: { price: "asc" } },
  "precio-desc": { label: "Precio ↓", order: { price: "desc" } },
  nombre: { label: "Nombre", order: { title: "asc" } },
};

type Params = Promise<{ slug: string }>;

async function loadSeller(slug: string) {
  return safeQuery(
    () =>
      prisma.user.findFirst({
        where: { slug, active: true, role: { in: ["SELLER", "ADMIN"] } },
        select: {
          id: true,
          role: true,
          name: true,
          slug: true,
          bio: true,
          city: true,
          region: true,
          avatarUrl: true,
          createdAt: true,
          offersShipping: true,
          offersPickup: true,
          store: { include: { plan: { select: { name: true } } } },
        },
      }),
    null
  );
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const seller = await loadSeller(slug);
  const store = seller?.store;
  if (!seller || !store || !isStoreActive(store)) return { title: seller?.name ?? "Tienda" };
  const name = store.displayName || seller.name;
  return {
    title: name,
    description: store.tagline || `Catálogo de ${name} en Win Condition TCG.`,
    alternates: { canonical: `/tienda/${slug}` },
    openGraph: { title: name, images: store.bannerUrl ? [store.bannerUrl] : store.logoUrl ? [store.logoUrl] : ["/opengraph-image"] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  let seller = await loadSeller(slug);
  // El administrador siempre tiene el plan Pro: si aún no está aplicado, se aplica ahora.
  if (seller?.role === "ADMIN" && !isStoreActive(seller.store)) {
    await ensureAdminPro(seller.id);
    seller = await loadSeller(slug);
  }
  if (!seller) notFound();
  const store = seller.store;
  // Sin plan vigente, la tienda no se muestra: el visitante ve el perfil normal del vendedor.
  if (!store || !isStoreActive(store)) redirect(`/vendedor/${seller.slug}`);

  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim();
  const gameParam = one("game");
  const game = isGameId(gameParam) ? gameParam : "";
  const type = TYPES.some((t) => t.value === one("type")) ? one("type") : "";
  const sort = SORTS[one("sort")] ? one("sort") : "recientes";
  const page = Math.max(1, Number(one("page")) || 1);

  // El dueño y el administrador mirando la tienda no cuentan como visitas.
  const viewer = await getCurrentUser();
  if (!viewer || (viewer.id !== seller.id && viewer.role !== "ADMIN")) {
    await recordStoreVisit(store.id, one("src") === "qr");
  }

  const baseWhere: Prisma.ListingWhereInput = { sellerId: seller.id, status: "ACTIVE" };
  const where: Prisma.ListingWhereInput = {
    ...baseWhere,
    ...(game ? { game } : {}),
    ...(type ? { type: type as Prisma.ListingWhereInput["type"] } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { setName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [listings, total, byGame, byType, featuredRaw, stats, reviews, origin] = await Promise.all([
    safeQuery(
      () =>
        prisma.listing.findMany({
          where,
          select: LISTING_CARD_SELECT,
          orderBy: [{ stock: "desc" }, SORTS[sort].order],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      [] as ListingCardData[]
    ),
    safeQuery(() => prisma.listing.count({ where }), 0),
    safeQuery(
      () => prisma.listing.groupBy({ by: ["game"], where: baseWhere, _count: { _all: true } }),
      [] as Array<{ game: string; _count: { _all: number } }>
    ),
    safeQuery(
      () => prisma.listing.groupBy({ by: ["type"], where: baseWhere, _count: { _all: true } }),
      [] as Array<{ type: string; _count: { _all: number } }>
    ),
    store.featuredListingIds.length > 0
      ? safeQuery(
          () =>
            prisma.listing.findMany({
              where: { id: { in: store.featuredListingIds }, sellerId: seller.id, status: "ACTIVE", stock: { gt: 0 } },
              select: LISTING_CARD_SELECT,
            }),
          [] as ListingCardData[]
        )
      : Promise.resolve([] as ListingCardData[]),
    getSellerStats([seller.id]),
    safeQuery(
      () =>
        prisma.review.findMany({
          where: { sellerId: seller.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, rating: true, comment: true, buyer: { select: { name: true } } },
        }),
      [] as Array<{ id: string; rating: number; comment: string | null; buyer: { name: string } }>
    ),
    siteOrigin(),
  ]);

  const featured = store.featuredListingIds
    .map((id) => featuredRaw.find((l) => l.id === id))
    .filter((l): l is ListingCardData => Boolean(l));
  const st = stats.get(seller.id) ?? { sales: 0, rating: 0, reviews: 0 };
  const salesLabel = formatSales(st.sales);
  const name = store.displayName || seller.name;
  const links = storeLinks(store);
  const region = sellerRegion(seller);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showFeatured = featured.length > 0 && !q && !game && !type && page === 1;

  const qr = buildQr(`${origin}/t/${seller.slug}?src=qr`, Boolean(store.logoUrl));
  const shareUrl = `${origin}/t/${seller.slug}`;

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: q || undefined,
      game: game || undefined,
      type: type || undefined,
      sort: sort !== "recientes" ? sort : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(current)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/tienda/${seller.slug}?${s}` : `/tienda/${seller.slug}`;
  };

  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={storeThemeVars(store.accentColor) as React.CSSProperties} >
      <StoreHeader
        slug={seller.slug}
        name={name}
        logoUrl={store.logoUrl ?? seller.avatarUrl}
        announcement={store.announcement}
        q={q}
        game={game}
        type={type}
        games={GAME_LIST.filter((g) => byGame.some((b) => b.game === g.id)).map((g) => g.id)}
        types={TYPES.filter((t) => byType.some((b) => b.type === t.value)).map((t) => t.value)}
        hasAbout={Boolean(store.about || seller.bio)}
      />

      {/* BANNER */}
      <div className="relative h-44 overflow-hidden sm:h-60 lg:h-72">
        {store.bannerUrl ? (
          <Image src={store.bannerUrl} alt="" fill priority sizes="100vw" className="object-cover" unoptimized />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700) 55%, #0b0f1a)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        {/* CABECERA DE LA TIENDA */}
        <header className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <span className="relative -mt-14 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-white bg-white font-display text-4xl font-bold text-brand-600 shadow-xl sm:-mt-16 sm:h-32 sm:w-32">
            {store.logoUrl ? (
              <Image src={store.logoUrl} alt={name} fill sizes="128px" className="object-cover" unoptimized />
            ) : seller.avatarUrl ? (
              <Image src={seller.avatarUrl} alt={name} fill sizes="128px" className="object-cover" unoptimized />
            ) : (
              initial
            )}
          </span>
          <div className="min-w-0 flex-1 basis-64 sm:pt-4">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
              {name}
              <span
                title="Tienda oficial verificada"
                className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-600"
              >
                <BadgeCheck className="h-4 w-4" strokeWidth={2.25} />
                Tienda verificada
              </span>
            </h1>
            {store.tagline && <p className="mt-1.5 text-[15px] text-ink-400">{store.tagline}</p>}
          </div>
        </header>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-300">
          {st.reviews > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-amber-500">
              <Star className="h-4 w-4 fill-current" strokeWidth={0} />
              {st.rating.toFixed(1)}
              <span className="font-normal text-ink-400">({st.reviews} {st.reviews === 1 ? "reseña" : "reseñas"})</span>
            </span>
          )}
          {salesLabel && <span className="font-semibold">{salesLabel}</span>}
          {(seller.city || region) && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" strokeWidth={2} />
              {[seller.city, region].filter((x, i, a) => x && a.indexOf(x) === i).join(", ")}
            </span>
          )}
          {seller.offersShipping && (
            <span className="inline-flex items-center gap-1">
              <Truck className="h-4 w-4" strokeWidth={2} /> Envío a todo Chile
            </span>
          )}
          {seller.offersPickup && (
            <span className="inline-flex items-center gap-1">
              <Store className="h-4 w-4" strokeWidth={2} /> Retiro en persona
            </span>
          )}
        </div>

        {/* ENLACES */}
        <div className="mt-5 flex flex-wrap items-start gap-2">
          {links.whatsapp && (
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
              <MessageCircle className="h-4 w-4" strokeWidth={2} />
              WhatsApp
            </a>
          )}
          {links.instagram && (
            <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              Instagram
            </a>
          )}
          {links.facebook && (
            <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              Facebook
            </a>
          )}
          {links.website && (
            <a href={links.website} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
              <Globe className="h-4 w-4" strokeWidth={2} />
              Sitio web
            </a>
          )}
          <ShareToggle>
            <ShareQrCard
              url={`${shareUrl}?src=qr`}
              displayUrl={shareUrl.replace(/^https?:\/\//, "")}
              qr={qr}
              logoUrl={store.logoUrl}
              filename={`qr-${seller.slug}`}
              title={`Comparte ${name}`}
              hint="Escanea el QR o copia el link para llevar esta tienda a cualquier lugar."
            />
          </ShareToggle>
        </div>

        {/* DESTACADOS */}
        {showFeatured && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-bold tracking-tight text-carbon">Destacados</h2>
            <div className="no-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
              {featured.map((l) => (
                <div key={l.id} className="w-[46vw] max-w-[220px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <ListingCard listing={l} href={`/tienda/${seller.slug}/producto/${l.slug}`} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CATÁLOGO */}
        <section id="catalogo" className="mt-10 scroll-mt-44">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight text-carbon">Catálogo</h2>
            <p className="text-[13px] text-ink-400">
              {total} {total === 1 ? "producto" : "productos"}
            </p>
          </div>

          <form action={`/tienda/${seller.slug}`} className="mt-4 flex gap-2">
            {game && <input type="hidden" name="game" value={game} />}
            {type && <input type="hidden" name="type" value={type} />}
            {sort !== "recientes" && <input type="hidden" name="sort" value={sort} />}
            <input
              name="q"
              defaultValue={q}
              placeholder={`Buscar en ${name}…`}
              aria-label="Buscar en la tienda"
              className="input max-w-md"
            />
            <button className="btn btn-primary btn-sm">Buscar</button>
            {(q || game || type) && (
              <Link href={`/tienda/${seller.slug}`} className="btn btn-secondary btn-sm">
                Limpiar
              </Link>
            )}
          </form>

          <div className="no-scrollbar mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
            <Link href={href({ game: undefined, page: undefined })} data-active={!game} className="pill shrink-0">
              Todos
            </Link>
            {GAME_LIST.filter((g) => byGame.some((b) => b.game === g.id)).map((g) => (
              <Link key={g.id} href={href({ game: g.id, page: undefined })} data-active={game === g.id} className="pill shrink-0">
                {g.short}
              </Link>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-ink-800" />
            {TYPES.map((t) => (
              <Link
                key={t.value}
                href={href({ type: type === t.value ? undefined : t.value, page: undefined })}
                data-active={type === t.value}
                className="pill shrink-0"
              >
                {t.label}
              </Link>
            ))}
            <span className="mx-1 h-5 w-px shrink-0 bg-ink-800" />
            {Object.entries(SORTS).map(([key, s]) => (
              <Link key={key} href={href({ sort: key, page: undefined })} data-active={sort === key} className="pill shrink-0">
                {s.label}
              </Link>
            ))}
          </div>

          {listings.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850 text-ink-500">
                <SearchX className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-display text-xl font-bold text-carbon">
                {q || game || type ? "Sin resultados" : "Esta tienda aún no tiene productos"}
              </p>
              {(q || game || type) && (
                <Link href={`/tienda/${seller.slug}`} className="btn btn-primary btn-sm mt-5">
                  Ver todo el catálogo
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} href={`/tienda/${seller.slug}/producto/${l.slug}`} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-ink-600">…</span>}
                    <Link href={href({ page: String(p) })} data-active={p === page} className="pill !min-w-9 !justify-center">
                      {p}
                    </Link>
                  </span>
                ))}
            </div>
          )}
        </section>

        {/* SOBRE LA TIENDA */}
        {(store.about || seller.bio) && (
          <section id="nosotros" className="mt-12 scroll-mt-44 rounded-3xl card-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-carbon">Sobre {name}</h2>
            <p className="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink-300">
              {store.about || seller.bio}
            </p>
          </section>
        )}

        {/* RESEÑAS */}
        {reviews.length > 0 && (
          <section className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-carbon">Lo que dicen los compradores</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl card-surface p-4">
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "fill-transparent text-ink-700"}`} strokeWidth={i < r.rating ? 0 : 1.5} />
                    ))}
                  </span>
                  {r.comment && <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-ink-300">{r.comment}</p>}
                  <p className="mt-2 text-[11px] font-semibold text-ink-400">{r.buyer.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      <p className="mx-auto max-w-7xl px-4 pb-2 pt-10 text-center text-[12px] text-ink-400">
        {name} vende con la garantía de Win Condition TCG: stock reservado, código de pago y comprobante en cada compra.
      </p>
    </div>
  );
}
