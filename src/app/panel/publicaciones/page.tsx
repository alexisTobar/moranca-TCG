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
  SOLD: "border-rose-500/40 bg-rose-500/10 text-brand-600",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Publicada",
  DRAFT: "Borrador",
  PAUSED: "Pausada",
  SOLD: "Vendida",
};

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : undefined;

  const where: Prisma.ListingWhereInput = {
    ...(user.role === "ADMIN" ? {} : { sellerId: user.id }),
    ...(status && ["ACTIVE", "DRAFT", "PAUSED", "SOLD"].includes(status)
      ? { status: status as Prisma.ListingWhereInput["status"] }
      : {}),
  };

  const listings = await safeQuery(
    () =>
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
          seller: { select: { name: true } },
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
      seller: { name: string };
      _count: { deckCards: number };
    }>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">Publicaciones</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {listings.length} {listings.length === 1 ? "publicación" : "publicaciones"}
            {user.role === "ADMIN" ? " en toda la tienda" : " tuyas"}
          </p>
        </div>
        <Link
          href="/panel/publicar"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-brand-500"
        >
          + Nueva
        </Link>
      </header>

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
            href={f.value ? `/panel/publicaciones?status=${f.value}` : "/panel/publicaciones"}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
              status === f.value
                ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
                : "border-ink-700 text-ink-400 hover:text-ink-200"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 p-16 text-center">
          <p className="text-sm text-ink-400">No hay publicaciones en este filtro.</p>
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
                  {user.role === "ADMIN" && (
                    <span className="text-[10px] text-ink-400">· {l.seller.name}</span>
                  )}
                </div>
              </div>

              <span className="hidden font-display text-sm font-bold text-accent-400 sm:block">
                {clp(l.price)}
              </span>

              <div className="flex shrink-0 items-center gap-1.5">
                <Link
                  href={`/producto/${l.slug}`}
                  className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-accent-300"
                  title="Ver en la tienda"
                >
                  Ver
                </Link>
                <Link
                  href={`/panel/publicaciones/${l.id}`}
                  className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:border-accent-500/60 hover:text-accent-300"
                >
                  Editar
                </Link>
                <DeleteListingButton id={l.id} title={l.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
