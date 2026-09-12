import Link from "next/link";
import Image from "next/image";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";
import { GameChip } from "@/components/GameChip";
import { DeleteListingButton } from "@/components/DeleteListingButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
  DRAFT: "border-ink-600 bg-ink-800 text-ink-300",
  PAUSED: "border-amber-500/40 bg-amber-500/10 text-amber-700",
  SOLD: "border-rose-500/40 bg-rose-500/10 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Publicada",
  DRAFT: "Borrador",
  PAUSED: "Pausada",
  SOLD: "Vendida",
};

const PAGE_SIZE = 30;

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const where: Prisma.ListingWhereInput = {
    sellerId: user.id,
    ...(status && ["ACTIVE", "DRAFT", "PAUSED", "SOLD"].includes(status)
      ? { status: status as Prisma.ListingWhereInput["status"] }
      : {}),
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
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          select: {
            id: true,
            slug: true,
            title: true,
            game: true,
            type: true,
            price: true,
            stock: true,
            status: true,
            imageUrl: true,
            createdAt: true,
            _count: { select: { deckCards: true } },
          },
        }),
      [] as Array<{
        id: string;
        slug: string;
        title: string;
        game: string;
        type: string;
        price: number;
        stock: number;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
        _count: { deckCards: number };
      }>
    ),
    safeQuery(() => prisma.listing.count({ where }), 0),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { q: q || undefined, status, ...patch };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/panel/publicaciones?${s}` : "/panel/publicaciones";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">Publicaciones</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {total} {total === 1 ? "publicación" : "publicaciones"} tuyas
          </p>
        </div>
        <Link
          href="/panel/publicar"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-brand-500"
        >
          + Nueva
        </Link>
      </header>

      <form action="/panel/publicaciones" className="flex gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o edición…"
          className="w-full max-w-sm rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200 outline-none focus:border-carbon"
        />
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-[12px] font-bold text-paper transition hover:bg-brand-500">
          Buscar
        </button>
        {q && (
          <Link
            href={buildHref({ q: undefined })}
            className="rounded-lg border border-ink-700 px-3 py-2 text-[12px] font-semibold text-ink-400 transition hover:text-ink-200"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-1.5">
        {[
          { value: undefined, label: "Todas" },
          { value: "ACTIVE", label: "Publicadas" },
          { value: "DRAFT", label: "Borradores" },
          { value: "PAUSED", label: "Pausadas" },
          { value: "SOLD", label: "Vendidas" },
        ].map((f) => (
          <Link
            key={f.label}
            href={buildHref({ status: f.value, page: undefined })}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
              status === f.value
                ? "border-carbon bg-carbon text-paper"
                : "border-ink-700 text-ink-400 hover:text-ink-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 p-16 text-center">
          <p className="text-sm text-ink-400">
            {q
              ? `Sin resultados para "${q}" en este filtro.`
              : "No hay publicaciones en este filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
          {listings.map((l) => (
            <li key={l.id} className="flex items-center gap-4 p-3.5">
              <span className="relative h-[68px] w-12 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950">
                {l.imageUrl && (
                  <Image
                    src={l.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
            unoptimized
          />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink-200">
                  {l.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <GameChip game={l.game} />
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      STATUS_STYLE[l.status] ?? ""
                    }`}
                  >
                    {STATUS_LABEL[l.status] ?? l.status}
                  </span>
                  {l.type === "DECK" && (
                    <span className="text-[10px] text-ink-400">
                      {l._count.deckCards} cartas
                    </span>
                  )}
                  <span className="text-[10px] text-ink-400">
                    Stock {l.stock} · {timeAgo(l.createdAt)}
                  </span>
                </div>
              </div>

              <span className="hidden font-display text-sm font-bold text-accent-400 sm:block">
                {clp(l.price)}
              </span>

              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/producto/${l.slug}`}
                  className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-carbon"
                  title="Ver en la tienda"
                >
                  Ver
                </Link>
                <Link
                  href={`/panel/publicaciones/${l.id}`}
                  className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:border-carbon hover:text-carbon"
                >
                  Editar
                </Link>
                <DeleteListingButton id={l.id} title={l.title} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
  );
}
