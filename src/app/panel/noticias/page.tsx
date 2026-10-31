import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel } from "@/lib/news/category";
import { MANUAL_NEWS_SOURCE } from "@/lib/news/policy";
import { NEWS_SOURCES } from "@/lib/news/sources";
import { DeleteNewsEvent, NewsEventForm } from "@/components/panel/NewsEventForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Noticias y eventos", robots: { index: false } };

/** Agenda de eventos de Chile cargados a mano y estado de las fuentes automáticas de noticias. */
export default async function PanelNewsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?sesion=expirada");
  if (user.role !== "ADMIN") redirect("/panel");
  const now = new Date();
  const [manual, bySource, sync] = await Promise.all([
    prisma.newsItem.findMany({ where: { sourceName: MANUAL_NEWS_SOURCE, eventAt: { gte: now } }, orderBy: { eventAt: "asc" }, take: 100 }),
    prisma.newsItem.groupBy({ by: ["sourceName"], _count: { _all: true }, _max: { publishedAt: true }, orderBy: { _count: { sourceName: "desc" } } }),
    prisma.newsSyncState.findUnique({ where: { id: "news" } }),
  ]);
  return <div className="space-y-8">
    <header>
      <h1 className="font-display text-3xl font-bold">Noticias y eventos</h1>
      <p className="mt-2 text-sm text-ink-400">Agrega eventos de Chile que no salen en ninguna fuente automática: días de cartas en tiendas, ferias o torneos locales. Aparecen destacados en la agenda de <Link href="/noticias" className="underline">Noticias</Link> y se quitan solos cuando pasa su fecha.</p>
    </header>

    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Nuevo evento</h2>
      <NewsEventForm />
    </section>

    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Eventos publicados <span className="text-ink-400">({manual.length})</span></h2>
      {manual.length === 0 ? <p className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">Todavía no has agregado eventos.</p> :
      <ul className="space-y-2">{manual.map((e) => <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl card-surface p-4">
        <div className="min-w-0">
          <p className="font-semibold">{e.title}</p>
          <p className="text-[13px] text-ink-400">{e.eventAt?.toLocaleDateString("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long" })} · {newsCategoryLabel(e.category)} · {e.excerpt}</p>
        </div>
        <DeleteNewsEvent id={e.id} />
      </li>)}</ul>}
    </section>

    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold">Fuentes automáticas</h2>
      <p className="text-sm text-ink-400">Se revisan todos los días a las 06:00 (hora de Chile). Última actualización completa: {sync?.completedAt ? timeAgo(sync.completedAt) : "todavía no corre"}.</p>
      <div className="overflow-x-auto rounded-2xl card-surface">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-ink-800 text-ink-400"><tr><th className="p-3">Fuente</th><th className="p-3">Publicaciones vigentes</th><th className="p-3">Más reciente</th></tr></thead>
          <tbody>{bySource.map((s) => <tr key={s.sourceName} className="border-b border-ink-800 last:border-0"><td className="p-3 font-medium">{s.sourceName}</td><td className="p-3">{s._count._all}</td><td className="p-3 text-ink-400">{s._max.publishedAt ? timeAgo(s._max.publishedAt) : "—"}</td></tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-ink-400">Fuentes configuradas: {NEWS_SOURCES.map((s) => s.name).join(", ")}. La prensa chilena llega vía Google Noticias, con el nombre de cada medio.</p>
    </section>
  </div>;
}
