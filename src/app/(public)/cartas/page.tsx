import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { GAME_LIST, CONDITIONS, LANGUAGES, LISTING_TYPES, isGameId } from "@/lib/games";
import { LISTING_CARD_SELECT, safeQuery } from "@/lib/catalog";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Catálogo de cartas",
  description:
    "Explora singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas.",
};

export const revalidate = 30;

const PAGE_SIZE = 24;

const SORTS: Record<string, Prisma.ListingOrderByWithRelationInput> = {
  recientes: { createdAt: "desc" },
  "precio-asc": { price: "asc" },
  "precio-desc": { price: "desc" },
  nombre: { title: "asc" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim() ?? "";
  const game = one(sp.game);
  const type = one(sp.type);
  const condition = one(sp.condition);
  const language = one(sp.language);
  const sort = one(sp.sort) ?? "recientes";
  const min = Number(one(sp.min) ?? "") || undefined;
  const max = Number(one(sp.max) ?? "") || undefined;
  const page = Math.max(1, Number(one(sp.page) ?? "1") || 1);

  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { setName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { deckCards: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (game && isGameId(game)) where.game = game;
  if (type && ["SINGLE", "SEALED", "DECK"].includes(type)) {
    where.type = type as Prisma.ListingWhereInput["type"];
  }
  if (condition) where.condition = condition;
  if (language) where.language = language;
  if (min || max) where.price = { ...(min ? { gte: min } : {}), ...(max ? { lte: max } : {}) };

  // Las publicaciones vendidas (stock agotado) siguen apareciendo en el
  // catálogo con su badge "Vendido", pero no deben competir con las
  // disponibles por posición: se arma la página en dos tramos — primero
  // todo lo disponible con el orden elegido, y recién cuando eso se agota
  // se completa con lo vendido, también en ese orden.
  const availableWhere: Prisma.ListingWhereInput = { ...where, stock: { gt: 0 } };
  const soldWhere: Prisma.ListingWhereInput = { ...where, stock: { lte: 0 } };
  const orderBy = SORTS[sort] ?? SORTS.recientes;

  const [availableCount, total] = await Promise.all([
    safeQuery(() => prisma.listing.count({ where: availableWhere }), 0),
    safeQuery(() => prisma.listing.count({ where }), 0),
  ]);

  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;

  const availableSkip = Math.min(startIndex, availableCount);
  const availableTake = Math.max(0, Math.min(endIndex, availableCount) - availableSkip);
  const soldSkip = Math.max(0, startIndex - availableCount);
  const soldTake = PAGE_SIZE - availableTake;

  const [availableListings, soldListings] = await Promise.all([
    availableTake > 0
      ? safeQuery(
          () =>
            prisma.listing.findMany({
              where: availableWhere,
              select: LISTING_CARD_SELECT,
              orderBy,
              skip: availableSkip,
              take: availableTake,
            }),
          [] as ListingCardData[]
        )
      : Promise.resolve([] as ListingCardData[]),
    soldTake > 0
      ? safeQuery(
          () =>
            prisma.listing.findMany({
              where: soldWhere,
              select: LISTING_CARD_SELECT,
              orderBy,
              skip: soldSkip,
              take: soldTake,
            }),
          [] as ListingCardData[]
        )
      : Promise.resolve([] as ListingCardData[]),
  ]);

  const listings = [...availableListings, ...soldListings];

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: q || undefined,
      game,
      type,
      condition,
      language,
      sort: sort !== "recientes" ? sort : undefined,
      min: min ? String(min) : undefined,
      max: max ? String(max) : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/cartas?${s}` : "/cartas";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-4 text-[12px] text-ink-400">
        <Link href="/" className="hover:text-carbon">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">Catálogo</span>
      </nav>

      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-carbon">
          {q ? `Resultados para “${q}”` : "Catálogo"}
        </h1>
        <p className="mt-1 text-[13px] text-ink-400">
          {total} {total === 1 ? "publicación encontrada" : "publicaciones encontradas"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* FILTROS */}
        <aside className="h-fit space-y-6 rounded-2xl card-surface p-5 lg:sticky lg:top-36">
          <FilterGroup label="Juego">
            <FilterPill href={buildHref({ game: undefined, page: undefined })} active={!game}>
              Todos
            </FilterPill>
            {GAME_LIST.map((g) => (
              <FilterPill
                key={g.id}
                href={buildHref({ game: g.id, page: undefined })}
                active={game === g.id}
              >
                {g.short}
              </FilterPill>
            ))}
          </FilterGroup>

          <FilterGroup label="Tipo">
            <FilterPill href={buildHref({ type: undefined, page: undefined })} active={!type}>
              Todos
            </FilterPill>
            {LISTING_TYPES.map((t) => (
              <FilterPill
                key={t.value}
                href={buildHref({ type: t.value, page: undefined })}
                active={type === t.value}
              >
                {t.label}
              </FilterPill>
            ))}
          </FilterGroup>

          <FilterGroup label="Estado">
            <FilterPill
              href={buildHref({ condition: undefined, page: undefined })}
              active={!condition}
            >
              Todos
            </FilterPill>
            {CONDITIONS.map((c) => (
              <FilterPill
                key={c.value}
                href={buildHref({ condition: c.value, page: undefined })}
                active={condition === c.value}
              >
                {c.value}
              </FilterPill>
            ))}
          </FilterGroup>

          <FilterGroup label="Idioma">
            <FilterPill
              href={buildHref({ language: undefined, page: undefined })}
              active={!language}
            >
              Todos
            </FilterPill>
            {LANGUAGES.map((l) => (
              <FilterPill
                key={l.value}
                href={buildHref({ language: l.value, page: undefined })}
                active={language === l.value}
              >
                {l.value}
              </FilterPill>
            ))}
          </FilterGroup>

          <form action="/cartas" className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
              Precio (CLP)
            </p>
            {q && <input type="hidden" name="q" value={q} />}
            {game && <input type="hidden" name="game" value={game} />}
            {type && <input type="hidden" name="type" value={type} />}
            <div className="flex gap-2">
              <input
                name="min"
                type="number"
                min={0}
                defaultValue={min}
                placeholder="Mín"
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-ink-200 outline-none focus:border-carbon"
              />
              <input
                name="max"
                type="number"
                min={0}
                defaultValue={max}
                placeholder="Máx"
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-ink-200 outline-none focus:border-carbon"
              />
            </div>
            <button className="w-full rounded-lg border border-ink-600 py-1.5 text-xs font-semibold text-ink-200 transition hover:border-carbon hover:text-carbon">
              Aplicar
            </button>
          </form>

          <Link
            href="/cartas"
            className="block text-center text-[11px] font-semibold uppercase tracking-widest text-ink-400 hover:text-carbon"
          >
            Limpiar filtros
          </Link>
        </aside>

        {/* RESULTADOS */}
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
              Ordenar
            </span>
            {Object.keys(SORTS).map((s) => (
              <Link
                key={s}
                href={buildHref({ sort: s, page: undefined })}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize transition ${
                  sort === s
                    ? "border-carbon bg-carbon text-paper"
                    : "border-ink-700 text-ink-400 hover:text-ink-200"
                }`}
              >
                {s.replace("-", " ")}
              </Link>
            ))}
          </div>

          {listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-700 p-16 text-center">
              <p className="font-display text-xl text-ink-300">Sin resultados</p>
              <p className="mt-2 text-[13px] text-ink-400">
                Prueba con otro término o quita algunos filtros.
              </p>
              <Link
                href="/cartas"
                className="mt-4 inline-block rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-paper"
              >
                Ver todo el catálogo
              </Link>
            </div>
          ) : (
            <Reveal className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </Reveal>
          )}

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: pages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-ink-600">…</span>
                    )}
                    <Link
                      href={buildHref({ page: String(p) })}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        p === page
                          ? "border-carbon bg-carbon text-paper"
                          : "border-ink-700 text-ink-300 hover:border-ink-600"
                      }`}
                    >
                      {p}
                    </Link>
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-300">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
        active
          ? "border-carbon bg-carbon text-paper"
          : "border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200"
      }`}
    >
      {children}
    </Link>
  );
}
