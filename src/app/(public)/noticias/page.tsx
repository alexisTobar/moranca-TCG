import Link from "next/link";
import { NewsImage } from "@/components/news/NewsImage";
import { publicNewsPage } from "@/lib/news/query";
import { CHILE_AGENDA } from "@/lib/news/sources";
import { catalogPage } from "@/lib/catalog-query";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel, NEWS_CATEGORIES } from "@/lib/news/category";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Torneos y Cardfest en Chile, noticias internacionales y lanzamientos de Pokémon y One Piece en español.",
};

export const revalidate = 300;

const PAGE_SIZE = 18;

export default async function NoticiasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawCategory = typeof sp.category === "string" ? sp.category : undefined;
  const category = NEWS_CATEGORIES.find(c => c === rawCategory);
  const scope = sp.scope === "chile" ? "chile" : sp.scope === "international" ? "international" : undefined;
  const kind = sp.kind === "TOURNAMENT" || sp.kind === "RELEASE" ? sp.kind : undefined;
  const requestedPage = catalogPage(typeof sp.page === "string" ? sp.page : undefined);
  const {items,pages,page,unavailable} = await publicNewsPage({category, scope, kind, page:requestedPage, take:PAGE_SIZE});

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const current: Record<string, string | undefined> = { category, scope, kind, ...patch };
    for (const [k, v] of Object.entries(current)) if (v) params.set(k, v);
    const s = params.toString();
    return s ? `/noticias?${s}` : "/noticias";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Noticias y torneos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Chile primero. Torneos, comunidad y lanzamientos de Pokémon y One Piece en español. Actualización cada 3 días.
        </p>
      </header>

      <section className="chile-agenda mt-6" aria-labelledby="chile-agenda-title">
        <h2 id="chile-agenda-title" className="font-display text-lg font-bold">Agenda de Chile y organizadores</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CHILE_AGENDA.map(source => <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="agenda-link"><strong>{source.name}</strong><span>{source.text}</span></a>)}
        </div>
        <p className="mt-3 text-xs text-ink-400">Confirma fechas, sedes y cupos con el organizador. Cardfest publica sus novedades en su canal oficial.</p>
      </section>
      <nav className="mt-7 flex flex-wrap gap-2" aria-label="Cobertura de noticias">
        {[{label:"Destacadas",value:undefined},{label:"Chile",value:"chile"},{label:"Internacionales",value:"international"}].map(option => <Link key={option.label} href={buildHref({scope:option.value,page:undefined})} className="pill" data-active={scope === option.value}>{option.label}</Link>)}
        <Link href={buildHref({kind:kind === "TOURNAMENT" ? undefined : "TOURNAMENT",page:undefined})} className="pill" data-active={kind === "TOURNAMENT"}>Torneos y eventos</Link>
        <Link href={buildHref({kind:kind === "RELEASE" ? undefined : "RELEASE",page:undefined})} className="pill" data-active={kind === "RELEASE"}>Lanzamientos</Link>
      </nav>
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

      {unavailable ? <p role="status" className="mt-8 rounded-xl border border-ink-700 p-6 text-sm text-ink-400">No pudimos cargar las noticias. Puedes consultar la agenda de organizadores y volver a intentarlo más tarde.</p> : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-ink-700 p-16 text-center">
          <Newspaper className="mx-auto h-10 w-10 text-ink-700" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-ink-400">Todavía no hay noticias en esta categoría.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.sourceUrl??`/noticias/${n.id}`}
              className="group overflow-hidden rounded-2xl card-surface transition hover:-translate-y-1 hover:border-carbon"
            >
              <div className="relative aspect-video overflow-hidden bg-ink-900">
                <NewsImage src={n.imageUrl} title={n.title} category={n.category} kind={n.kind} />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-carbon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-paper">
                  {n.country === "CL" ? "Chile · " : ""}{newsCategoryLabel(n.category)}
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
                  {n.sourceName} · {n.eventAt ? `Evento: ${n.eventAt.toLocaleDateString("es-CL",{timeZone:"America/Santiago"})}` : timeAgo(n.publishedAt)}
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
