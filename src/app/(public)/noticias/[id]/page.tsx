import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel, newsCategoryColor } from "@/lib/news/category";

async function getNewsItem(id: string) {
  return safeQuery(() => prisma.newsItem.findUnique({ where: { id } }), null);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) return { title: "Noticia no encontrada" };
  return { title: item.title, description: item.excerpt };
}

export default async function NoticiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getNewsItem(id);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-[12px] text-ink-400">
        <Link href="/noticias" className="hover:text-accent-300">
          Noticias
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">{item.title}</span>
      </nav>

      <span
        className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper"
        style={{ background: newsCategoryColor(item.category) }}
      >
        {newsCategoryLabel(item.category)}
      </span>

      <h1 className="mt-3 font-display text-2xl font-bold leading-tight text-carbon sm:text-3xl">
        {item.title}
      </h1>
      <p className="mt-2 text-[12px] text-ink-400">
        {item.sourceName} · {timeAgo(item.publishedAt)}
      </p>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="720px"
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-700">
            <Newspaper className="h-12 w-12" strokeWidth={1.5} />
          </div>
        )}
      </div>

      <p className="mt-6 text-[15px] leading-relaxed text-ink-300">{item.excerpt}</p>

      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper transition hover:bg-brand-500"
      >
        Leer la nota completa en {item.sourceName}
        <ExternalLink className="h-4 w-4" strokeWidth={2} />
      </a>

      <p className="mt-4 text-[11px] text-ink-400">
        Este resumen se genera automáticamente a partir de {item.sourceName}. El
        contenido completo y los derechos son de la fuente original.
      </p>
    </div>
  );
}
