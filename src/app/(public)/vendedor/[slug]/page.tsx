import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { safeQuery, LISTING_CARD_SELECT } from "@/lib/catalog";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { GAME_LIST, isGameId } from "@/lib/games";

const PAGE_SIZE = 30;

export const revalidate = 30;

async function getSeller(slug: string) {
  return safeQuery(
    () =>
      prisma.user.findFirst({
        where: { slug, active: true },
        select: {
          id: true,
          name: true,
          slug: true,
          bio: true,
          city: true,
          role: true,
          createdAt: true,
        },
      }),
    null
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const seller = await getSeller(slug);
  return {
    title: seller ? seller.name : "Vendedor",
    description: seller?.bio ?? `Publicaciones de ${seller?.name ?? ""} en Dream Deck TCG.`,
  };
}

export default async function SellerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const seller = await getSeller(slug);
  if (!seller) notFound();

  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const gameParam = typeof sp.game === "string" ? sp.game : "";
  const game = isGameId(gameParam) ? gameParam : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const where: Prisma.ListingWhereInput = {
    sellerId: seller.id,
    status: "ACTIVE",
    ...(game ? { game } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { setName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [listings, total] = await Promise.all([
    safeQuery(
      () =>
        prisma.listing.findMany({
          where,
          select: LISTING_CARD_SELECT,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        }),
      [] as ListingCardData[]
    ),
    safeQuery(() => prisma.listing.count({ where }), 0),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params2 = new URLSearchParams();
    const current: Record<string, string | undefined> = {
      q: q || undefined,
      game: game || undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(current)) if (v) params2.set(k, v);
    const s = params2.toString();
    return s ? `/vendedor/${slug}?${s}` : `/vendedor/${slug}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="mb-6 text-[12px] text-ink-400">
        <Link href="/vendedores" className="hover:text-accent-300">
          Vendedores
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">{seller.name}</span>
      </nav>

      <header className="flex flex-wrap items-center gap-5 rounded-2xl card-surface p-6">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-display text-2xl font-bold text-paper">
          {seller.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-carbon">{seller.name}</h1>
            {seller.role === "ADMIN" && (
              <span className="rounded-full border border-accent-500/40 bg-accent-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-300">
                Oficial
              </span>
            )}
          </div>
          <p className="mt-1 text-[12px] text-ink-400">
            {total} publicaciones activas
            {seller.city ? ` · ${seller.city}` : ""} · Miembro desde{" "}
            {seller.createdAt.toLocaleDateString("es-CL", {
              month: "long",
              year: "numeric",
            })}
          </p>
          {seller.bio && (
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-300">
              {seller.bio}
            </p>
          )}
        </div>
      </header>

      {total > 0 && (
        <div className="mt-6 space-y-3">
          <form action={`/vendedor/${slug}`} className="flex gap-2">
            {game && <input type="hidden" name="game" value={game} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar en las cartas de este vendedor…"
              className="w-full max-w-sm rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-accent-500/70"
            />
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-bold text-paper transition hover:bg-brand-500">
              Buscar
            </button>
            {(q || game) && (
              <Link
                href={`/vendedor/${slug}`}
                className="rounded-lg border border-ink-700 px-3 py-2 text-[12px] font-semibold text-ink-400 transition hover:text-ink-200"
              >
                Limpiar
              </Link>
            )}
          </form>

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ game: undefined, page: undefined })}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                !game
                  ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
                  : "border-ink-700 text-ink-400 hover:text-ink-200"
              }`}
            >
              Todos los juegos
            </Link>
            {GAME_LIST.map((g) => (
              <Link
                key={g.id}
                href={buildHref({ game: g.id, page: undefined })}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  game === g.id
                    ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
                    : "border-ink-700 text-ink-400 hover:text-ink-200"
                }`}
              >
                {g.short}
              </Link>
            ))}
          </div>
        </div>
      )}

      {listings.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-ink-700 p-12 text-center text-sm text-ink-400">
          {total === 0
            ? "Este vendedor aún no tiene publicaciones activas."
            : q
              ? `Sin resultados para "${q}".`
              : "Sin resultados con ese filtro."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
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
                      ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
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
  );
}
