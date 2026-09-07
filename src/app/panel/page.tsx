import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";
import { GameChip } from "@/components/GameChip";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = user.role === "ADMIN";
  const scope = isAdmin ? {} : { sellerId: user.id };

  const [active, drafts, sold, totalValue, recent, pendingOrders] = await Promise.all([
    safeQuery(
      () => prisma.listing.count({ where: { ...scope, status: "ACTIVE" } }),
      0
    ),
    safeQuery(
      () => prisma.listing.count({ where: { ...scope, status: "DRAFT" } }),
      0
    ),
    safeQuery(() => prisma.listing.count({ where: { ...scope, status: "SOLD" } }), 0),
    safeQuery(
      () =>
        prisma.listing.aggregate({
          where: { ...scope, status: "ACTIVE" },
          _sum: { price: true },
        }),
      { _sum: { price: null } } as { _sum: { price: number | null } }
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: scope,
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            slug: true,
            title: true,
            game: true,
            price: true,
            status: true,
            imageUrl: true,
            createdAt: true,
          },
        }),
      [] as Array<{
        id: string;
        slug: string;
        title: string;
        game: string;
        price: number;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
      }>
    ),
    safeQuery(
      async () =>
        isAdmin ? prisma.order.count({ where: { status: "PENDING" } }) : 0,
      0
    ),
  ]);

  const stats = [
    { label: "Publicaciones activas", value: String(active), href: "/panel/publicaciones" },
    { label: "Borradores", value: String(drafts), href: "/panel/publicaciones?status=DRAFT" },
    { label: "Vendidas", value: String(sold), href: "/panel/publicaciones?status=SOLD" },
    {
      label: "Valor en catálogo",
      value: clp(totalValue._sum.price ?? 0),
      href: "/panel/publicaciones",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">
            Hola, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {isAdmin
              ? "Tienes control total sobre publicaciones, perfiles y órdenes."
              : "Administra tus publicaciones en Dream Deck TCG."}
          </p>
        </div>
        <Link
          href="/panel/publicar"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-brand-500"
        >
          + Nueva publicación
        </Link>
      </header>

      {isAdmin && pendingOrders > 0 && (
        <Link
          href="/panel/ordenes"
          className="block rounded-xl border border-accent-500/40 bg-accent-500/10 p-4 text-[13px] text-accent-300 transition hover:bg-accent-500/15"
        >
          Tienes <strong>{pendingOrders}</strong>{" "}
          {pendingOrders === 1 ? "orden pendiente" : "órdenes pendientes"} por revisar →
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl card-surface p-5 transition hover:border-accent-500/40"
          >
            <p className="text-[11px] uppercase tracking-widest text-ink-400">
              {s.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-carbon">{s.value}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold text-carbon">
            Últimas publicaciones
          </h2>
          <Link
            href="/panel/publicaciones"
            className="text-[12px] font-semibold text-accent-300 hover:text-accent-400"
          >
            Ver todas →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center">
            <p className="text-sm text-ink-400">Todavía no has publicado nada.</p>
            <Link
              href="/panel/publicar"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-5 py-2 text-xs font-bold text-paper"
            >
              Crear la primera publicación
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
            {recent.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/panel/publicaciones/${l.id}`}
                  className="flex items-center gap-4 p-3.5 transition hover:bg-ink-850/60"
                >
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950">
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
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-200">
                      {l.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <GameChip game={l.game} />
                      <span className="text-[11px] text-ink-400">
                        {timeAgo(l.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-sm font-bold text-accent-400">
                      {clp(l.price)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-400">
                      {l.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
