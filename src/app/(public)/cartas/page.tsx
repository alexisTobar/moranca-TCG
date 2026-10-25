import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { catalogMarket } from "@/lib/catalog-market";
import { cardMarketHref } from "@/lib/card-identity";
import { GAME_LIST, ACCESSORY_CATEGORIES, CONDITIONS, LANGUAGES, LISTING_TYPES, isGameId } from "@/lib/games";
import { LISTING_CARD_SELECT } from "@/lib/catalog";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { redirect } from "next/navigation";
import { FilterDrawer } from "@/components/FilterDrawer";
import { SearchX } from "lucide-react";
import { catalogPage, catalogPrice, paginationWindow } from "@/lib/catalog-query";
import { JsonLd } from "@/components/JsonLd";
import { siteUrl } from "@/lib/seo";

const TYPE_SEO: Record<string, string> = { SINGLE: "Singles", SEALED: "Sellados", DECK: "Mazos armados", ACCESSORY: "Accesorios" };

/** Título y canonical propios por juego y tipo, para que cada vista posicione por lo que muestra. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const rawGame = one(sp.game);
  const type = one(sp.type) === "ACCESSORY" ? "ACCESSORY" : one(sp.type) === "SEALED" ? "SEALED" : one(sp.type) === "DECK" ? "DECK" : "SINGLE";
  const game = type === "ACCESSORY" ? undefined : rawGame;
  const gameName = game && isGameId(game) ? GAME_LIST.find((g) => g.id === game)?.name : undefined;
  const typeName = TYPE_SEO[type];
  const page = catalogPage(one(sp.page));
  const filtered = ["q", "accessory", "condition", "language", "sort", "min", "max"].some(key => !!one(sp[key]));
  const pagination = page > 1 ? ` · Página ${page}` : "";

  if (!gameName && !typeName) {
    return {
      title: `Catálogo de cartas TCG en Chile${pagination}`,
      description: "Explora singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas con stock reservado y envíos a todo Chile.",
      alternates: { canonical: page > 1 ? `/cartas?page=${page}` : "/cartas" },
      robots: filtered ? { index: false, follow: true } : undefined,
    };
  }
  const what = [typeName ?? "Cartas", gameName].filter(Boolean).join(" de ");
  const canon = new URLSearchParams({ ...(gameName && game ? { game } : {}), ...(type !== "SINGLE" ? { type } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
  return {
    title: `${what} en Chile${pagination}`,
    robots: filtered ? { index: false, follow: true } : undefined,
    description: type === "ACCESSORY" ? "Protectores, portamazos, tapetes y otros accesorios: compara precios y compra a vendedores chilenos con stock reservado." : `${what} de vendedores chilenos: compara precios, elige idioma y estado, y compra con stock reservado y pago por transferencia.`,
    alternates: { canonical: canon ? `/cartas?${canon}` : "/cartas" },
  };
}

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
  const q = (one(sp.q)?.trim() ?? "").slice(0, 120);
  const rawGame = one(sp.game);
  const type = one(sp.type) === "ACCESSORY" ? "ACCESSORY" : one(sp.type) === "SEALED" ? "SEALED" : one(sp.type) === "DECK" ? "DECK" : "SINGLE";
  const game = type === "ACCESSORY" ? undefined : rawGame;
  const accessoryCategory = type === "ACCESSORY" ? ACCESSORY_CATEGORIES.find(c => c.value === one(sp.accessory))?.value : undefined;
  const condition = one(sp.condition);
  const language = type === "ACCESSORY" ? undefined : one(sp.language);
  const sort = one(sp.sort) ?? "recientes";
  const rawMin = catalogPrice(one(sp.min));
  const rawMax = catalogPrice(one(sp.max));
  const min = rawMin !== undefined && rawMax !== undefined ? Math.min(rawMin, rawMax) : rawMin;
  const max = rawMin !== undefined && rawMax !== undefined ? Math.max(rawMin, rawMax) : rawMax;
  const requestedPage = catalogPage(one(sp.page));
  let unavailable = false;
  async function catalogQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
    try { return await query(); } catch { unavailable = true; return fallback; }
  }

  const result = await catalogQuery(() => catalogMarket({ type, accessoryCategory, game: game && (isGameId(game) || (type === "ACCESSORY" && game === "generic")) ? game : undefined, q, condition, language, min, max, sort, page: requestedPage }), {total:0, pages:1, page:1, listings:[]});
  const {total, pages, page, listings} = result;
  if (!unavailable && requestedPage > pages) {
    const corrected = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) { const v=one(value); if (v !== undefined && key !== "page") corrected.set(key,v); }
    if (pages > 1) corrected.set("page",String(pages));
    redirect('/cartas' + (corrected.size ? '?' + corrected : ''));
  }
  const startIndex = (page-1)*PAGE_SIZE;

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: q || undefined,
      game,
      type,
      accessory: accessoryCategory,
      condition,
      language,
      sort: sort !== "recientes" ? sort : undefined,
      min: min !== undefined ? String(min) : undefined,
      max: max !== undefined ? String(max) : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/cartas?${s}` : "/cartas";
  };

  return (
    <div className="catalog-editorial"><div className="mx-auto max-w-7xl px-4 py-8">
      {!unavailable && <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", itemListElement: listings.map((l, i) => ({ "@type": "ListItem", position: startIndex + i + 1, name: l.title, url: `${siteUrl()}${l.market ? cardMarketHref(l.game,l.market.identity) : `/producto/${l.slug}`}` })) }} />}
      <nav className="mb-4 text-[12px] text-ink-400">
        <Link href="/" className="hover:text-carbon">
          Inicio
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">Catálogo</span>
      </nav>

      <header className="catalog-heading mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
          {q ? `Resultados para “${q}”` : type === "SINGLE" ? "Cartas" : type === "SEALED" ? "Sellados" : type === "ACCESSORY" ? "Accesorios" : "Mazos"}
        </h1>
        <p className="mt-1 text-[13px] text-ink-400">
          {unavailable ? "El catálogo no está disponible temporalmente." : `${total} ${type === "SINGLE" ? "cartas · compara vendedores y precios" : "publicaciones encontradas"}`}
        </p>
      </header>

      {(type === "ACCESSORY" || type === "DECK") && <Link href={`/panel/publicar?type=${type}`} className="btn btn-primary mb-6">{type === "DECK" ? "Vender un mazo" : "Vender un accesorio"}</Link>}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* FILTROS */}
        <FilterDrawer activeCount={[game, type, accessoryCategory, condition, language, min, max].filter(Boolean).length}>
          {type !== "ACCESSORY" && <FilterGroup label="Juego">
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

          }

          <FilterGroup label="Categoría">
            {LISTING_TYPES.map((t) => (
              <FilterPill
                key={t.value}
                href={buildHref({ type: t.value, page: undefined, ...(type !== t.value ? { condition: undefined, language: undefined, accessory: undefined, ...(game === "generic" ? { game: undefined } : {}) } : {}) })}
                active={type === t.value}
              >
                {t.value === "SINGLE" ? "Cartas" : t.value === "SEALED" ? "Sellados" : t.value === "ACCESSORY" ? "Accesorios" : "Mazos"}
              </FilterPill>
            ))}
          </FilterGroup>

          {type === "ACCESSORY" && <FilterGroup label="Tipo de accesorio">
            <FilterPill href={buildHref({ accessory: undefined, page: undefined })} active={!accessoryCategory}>Todos</FilterPill>
            {ACCESSORY_CATEGORIES.map(c => <FilterPill key={c.value} href={buildHref({ accessory: c.value, page: undefined })} active={accessoryCategory === c.value}>{c.label}</FilterPill>)}
          </FilterGroup>}

          <FilterGroup label="Estado">
            <FilterPill
              href={buildHref({ condition: undefined, page: undefined })}
              active={!condition}
            >
              Todos
            </FilterPill>
            {(type === "ACCESSORY" ? [{value:"NEW",label:"Nuevo"},{value:"USED",label:"Usado"}] : CONDITIONS).map((c) => (
              <FilterPill
                key={c.value}
                href={buildHref({ condition: c.value, page: undefined })}
                active={condition === c.value}
              >
                {type === "ACCESSORY" ? c.label : c.value}
              </FilterPill>
            ))}
          </FilterGroup>

          {type !== "ACCESSORY" && <FilterGroup label="Idioma">
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

          }

          <form action="/cartas" className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
              Precio (CLP)
            </p>
            {accessoryCategory && <input type="hidden" name="accessory" value={accessoryCategory} />}
            {q && <input type="hidden" name="q" value={q} />}
            {game && <input type="hidden" name="game" value={game} />}
            {type && <input type="hidden" name="type" value={type} />}
            {condition && <input type="hidden" name="condition" value={condition} />}
            {language && <input type="hidden" name="language" value={language} />}
            <input type="hidden" name="sort" value={sort} />
            <div className="flex gap-2">
              <input
                name="min"
                aria-label="Precio mínimo en pesos chilenos"
                type="number"
                min={0}
                defaultValue={min}
                placeholder="Mín"
                className="input !py-2 !text-xs"
              />
              <input
                name="max"
                aria-label="Precio máximo en pesos chilenos"
                type="number"
                min={0}
                defaultValue={max}
                placeholder="Máx"
                className="input !py-2 !text-xs"
              />
            </div>
            <button className="btn btn-secondary btn-sm w-full">Aplicar</button>
          </form>

          <Link
            href={type === "SINGLE" ? "/cartas" : `/cartas?type=${type}`}
            className="block text-center text-[11px] font-semibold uppercase tracking-widest text-ink-400 hover:text-carbon"
          >
            Limpiar filtros
          </Link>
        </FilterDrawer>

        {/* RESULTADOS */}
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
              Ordenar
            </span>
            {Object.keys(SORTS).map((s) => (
              <Link
                key={s}
                href={buildHref({ sort: s, page: undefined })}
                data-active={sort === s}
                className="pill capitalize"
              >
                {{recientes:"Más recientes","precio-asc":"Menor precio","precio-desc":"Mayor precio",nombre:"Nombre"}[s]}
              </Link>
            ))}
          </div>

          {unavailable ? <div role="status" className="border-y border-ink-700 py-12"><h2 className="font-display text-2xl">No pudimos cargar las publicaciones</h2><p className="mt-3 max-w-lg text-sm text-ink-400">La conexión con el catálogo está interrumpida. Tus filtros se conservan; vuelve a intentarlo en unos momentos.</p><a href={buildHref({ page: String(page) })} className="btn btn-primary mt-5">Volver a intentar</a></div> : listings.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850 text-ink-500">
                <SearchX className="h-7 w-7" strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-display text-xl font-bold text-carbon">Sin resultados</p>
              <p className="mt-1.5 text-[13px] text-ink-400">
                Prueba con otro término o quita algunos filtros.
              </p>
              <Link href={type === "SINGLE" ? "/cartas" : `/cartas?type=${type}`} className="btn btn-primary btn-sm mt-5">
                Quitar filtros de esta categoría
              </Link>
            </div>
          ) : (
            <div className="catalog-results">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Páginas del catálogo" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {paginationWindow(page, pages)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-2">
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="text-ink-600">…</span>
                    )}
                    <Link
                      href={buildHref({ page: String(p) })}
                      data-active={p === page}
                      aria-current={p === page ? "page" : undefined}
                      aria-label={`Página ${p}`}
                      className="pill !min-w-9 !justify-center"
                    >
                      {p}
                    </Link>
                  </span>
                ))}
            </nav>
          )}
        </div>
      </div>
    </div></div>
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
      data-active={active}
      className="pill !px-3 !py-1"
    >
      {children}
    </Link>
  );
}
