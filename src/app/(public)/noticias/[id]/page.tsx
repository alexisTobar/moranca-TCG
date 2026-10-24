import Link from "next/link";
import { NewsImage } from "@/components/news/NewsImage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel } from "@/lib/news/category";
import { eligibleNewsWhere } from "@/lib/news/query";

async function getNewsItem(id: string) {
  return safeQuery(() => prisma.newsItem.findFirst({ where: { id, ...eligibleNewsWhere() } }), null);
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
      <nav className="mb-6 break-words text-[12px] text-ink-400">
        <Link href="/noticias" className="hover:text-carbon">
          Noticias
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">{item.title}</span>
      </nav>

      <span className="inline-block rounded-full bg-carbon px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper">
        {newsCategoryLabel(item.category)}
      </span>

      <h1 className="mt-3 break-words font-display text-2xl font-bold leading-tight text-carbon sm:text-3xl">
        {item.title}
      </h1>
      <p className="mt-2 text-[12px] text-ink-400">
        {item.sourceName} · {item.country === "CL" ? "Chile · " : ""}{item.eventAt ? `Evento: ${item.eventAt.toLocaleDateString("es-CL",{timeZone:"America/Santiago"})}` : timeAgo(item.publishedAt)}
      </p>

      <div className="relative mt-6 aspect-video overflow-hidden rounded-2xl border border-ink-700 bg-ink-900">
        <NewsImage src={item.imageUrl} title={item.title} category={item.category} kind={item.kind} priority />
      </div>

      <p className="mt-6 text-[15px] leading-relaxed text-ink-300">{item.excerpt}</p>

      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-lg mt-8 inline-flex items-center gap-2"
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
