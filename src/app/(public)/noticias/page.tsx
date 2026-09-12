import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel, NEWS_CATEGORIES } from "@/lib/news/category";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Noticias, anuncios y torneos de Magic, Pokémon, One Piece y Mitos y Leyendas.",
};

export const revalidate = 300;

const PAGE_SIZE = 18;

type NewsRow = {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: Date;
};

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : "1") || 1);

  const where: Prisma.NewsItemWhereInput =
    category && (NEWS_CATEGORIES as readonly string[]).includes(category)
      ? { category: category as Prisma.NewsItemWhereInput["category"] }
      : {};

  const [items, total] = await Promise.all([
    safeQuery(
      () =>
        prisma.newsItem.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
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
      [] as NewsRow[]
    ),
    safeQuery(() => prisma.newsItem.count({ where }), 0),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { category, ...patch };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/noticias?${s}` : "/noticias";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Noticias y torneos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Curado de las fuentes más seguidas de cada juego — siempre con link a la nota
          original.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <Link
          href={buildHref({ category: undefined, page: undefined })}
          className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
            !category
              ? "border-carbon bg-carbon text-paper"
              : "border-ink-700 text-ink-400 hover:text-ink-200"
          }`}
        >
          Todas
        </Link>
        {NEWS_CATEGORIES.map((c) => (
          <Link
            key={c}
            href={buildHref({ category: c, page: undefined })}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
              category === c
                ? "border-carbon bg-carbon text-paper"
                : "border-ink-700 text-ink-400 hover:text-ink-200"
            }`}
          >
            {newsCategoryLabel(c)}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink-700 p-16 text-center">
          <Newspaper className="mx-auto h-10 w-10 text-ink-700" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-ink-400">Todavía no hay noticias en esta categoría.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <Link
              key={n.id}
              href={`/noticias/${n.id}`}
              className="group overflow-hidden rounded-2xl card-surface transition hover:-translate-y-1 hover:border-carbon"
            >
              <div className="relative h-40 overflow-hidden bg-ink-900">
                {n.imageUrl ? (
                  <Image
                    src={n.imageUrl}
                    alt={n.title}
                    fill
                    sizes="(max-width:640px) 100vw, 360px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-700">
                    <Newspaper className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-carbon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-paper">
                  {newsCategoryLabel(n.category)}
                </span>
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 text-[14px] font-semibold leading-snug text-ink-200 group-hover:text-carbon">
                  {n.title}
                </h2>
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-400">
                  {n.excerpt}
                </p>
                <p className="mt-2 text-[11px] text-ink-400">
                  {n.sourceName} · {timeAgo(n.publishedAt)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 2)
            .map((p, idx, arr) => (
              <span key={p} className="flex items-center gap-2">
                {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-ink-600">…</span>}
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
