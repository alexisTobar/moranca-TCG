import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { marketAnalysis, type MarketRow } from "@/lib/market-analysis";
import { clp } from "@/lib/format";
import { gameName } from "@/lib/games";
import { LiveActivity } from "@/components/panel/LiveActivity";

export const dynamic = "force-dynamic";
export const metadata = { title: "Análisis de mercado", robots: { index: false } };

const RANGES = [7, 30, 90, 365];
const TYPE_LABEL: Record<string, string> = { SINGLE: "Cartas", SEALED: "Sellados", DECK: "Mazos", ACCESSORY: "Accesorios" };
const STATUS_LABEL: Record<string, string> = { PENDING: "Pendientes", PAID: "Pagadas", SHIPPED: "Enviadas", DELIVERED: "Entregadas", CANCELLED: "Canceladas", OPEN: "Abiertos", ANSWERED: "Respondidos", CLOSED: "Cerrados" };

function Bars({ rows, label }: { rows: MarketRow[]; label: (value: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  if (!rows.length) return <p className="mt-3 text-sm text-ink-400">Sin ventas confirmadas en este periodo.</p>;
  return <ul className="mt-4 space-y-3">{rows.map((r) => <li key={r.label} className="text-sm">
    <div className="flex justify-between gap-3"><span className="font-medium">{label(r.label)}</span><span className="tabular-nums text-ink-400">{r.units} u · {clp(r.amount)}</span></div>
    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink-850"><div className="h-full rounded-full bg-brand-600" style={{ width: `${(100 * r.amount) / max}%` }} /></div>
  </li>)}</ul>;
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.role !== "ADMIN") redirect("/panel");
  const requested = Number((await searchParams).dias);
  const days = RANGES.includes(requested) ? requested : 30;
  let data;
  try { data = await marketAnalysis(days); }
  catch { return <div className="rounded-2xl card-surface p-8"><h1 className="text-2xl font-bold">Análisis no disponible</h1><p className="mt-3">No fue posible leer los datos de ventas. Revisa la conexión a la base de datos.</p></div>; }

  const kpis: Array<[string, string]> = [
    ["Ventas confirmadas", clp(data.revenue)], ["Unidades vendidas", data.units.toLocaleString("es-CL")],
    ["Órdenes creadas", data.orders.toLocaleString("es-CL")], ["Conversión a pago", `${(data.conversion * 100).toFixed(1)} %`],
    ["Ticket promedio", clp(data.paidOrders ? Math.round(data.revenue / data.paidOrders) : 0)], ["Compradores nuevos", data.newBuyers.toLocaleString("es-CL")],
  ];
  return <div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Solo administración</p><h1 className="mt-2 font-display text-3xl font-bold">Análisis de mercado</h1><p className="mt-2 text-sm text-ink-400">Qué se vende, qué se mira, dónde compran y qué falta publicar. Las ventas son lo que pagaron los compradores en órdenes pagadas, enviadas o entregadas; las tablas por producto usan el precio de cada artículo.</p></div>
      <nav aria-label="Periodo" className="flex gap-1.5">{RANGES.map((r) => <Link key={r} href={`/panel/mercado?dias=${r}`} aria-current={r === days ? "page" : undefined} className={`btn btn-sm ${r === days ? "btn-primary" : "btn-secondary"}`}>{r === 365 ? "1 año" : `${r} días`}</Link>)}</nav>
    </header>

    <LiveActivity />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kpis.map(([label, value]) => <div key={label} className="rounded-2xl card-surface p-5"><p className="text-xs text-ink-400">{label}</p><p className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</p></div>)}</div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Ventas por juego</h2><Bars rows={data.byGame} label={gameName} /></section>
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Ventas por categoría</h2><Bars rows={data.byType} label={(t) => TYPE_LABEL[t] ?? t} /></section>
    </div>

    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Productos más vendidos</h2>
      {data.topProducts.length ? <table className="mt-3 w-full text-left text-sm"><thead><tr><th scope="col" className="py-2">Producto</th><th scope="col" className="text-right">Unidades</th><th scope="col" className="text-right">Monto</th></tr></thead><tbody>{data.topProducts.map((p) => <tr key={p.label} className="border-t border-ink-800"><td className="py-2.5">{p.label}</td><td className="text-right tabular-nums">{p.units}</td><td className="text-right tabular-nums">{clp(p.amount)}</td></tr>)}</tbody></table> : <p className="mt-3 text-sm text-ink-400">Sin ventas en este periodo.</p>}
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Dónde compran (región de envío)</h2>
        {data.regions.length ? <ul className="mt-3 divide-y divide-ink-800 text-sm">{data.regions.map((r) => <li key={r.label} className="flex justify-between gap-3 py-2.5"><span>{r.label}</span><span className="tabular-nums text-ink-400">{r.orders} órdenes · {clp(r.amount)}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-400">Sin datos.</p>}
      </section>
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Publicaciones más vistas</h2><p className="mt-1 text-xs text-ink-400">Contador histórico de vistas de cada publicación activa.</p>
        {data.viewed.length ? <ul className="mt-3 divide-y divide-ink-800 text-sm">{data.viewed.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2.5"><Link href={`/producto/${l.slug}`} className="truncate hover:underline">{l.title}</Link><span className="shrink-0 tabular-nums text-ink-400">{l.views} vistas · stock {l.stock}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-400">Sin datos.</p>}
      </section>
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Lo que más buscan</h2><p className="mt-1 text-xs text-ink-400">Búsquedas del catálogo de quienes aceptaron estadísticas. No guarda quién buscó.</p>
        {data.searches.length ? <ul className="mt-3 divide-y divide-ink-800 text-sm">{data.searches.map((s) => <li key={s.term} className="flex justify-between gap-3 py-2.5"><Link href={`/cartas?q=${encodeURIComponent(s.term)}`} className="truncate hover:underline">{s.term}</Link><span className="shrink-0 tabular-nums text-ink-400">{s.count} {s.count === 1 ? "búsqueda" : "búsquedas"}, {s.avgResults} {s.avgResults === 1 ? "resultado" : "resultados"}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-400">Aún no hay búsquedas registradas.</p>}
      </section>
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Buscan y no encuentran</h2><p className="mt-1 text-xs text-ink-400">Búsquedas sin resultados: productos que conviene conseguir o pedir a los vendedores.</p>
        {data.emptySearches.length ? <ul className="mt-3 divide-y divide-ink-800 text-sm">{data.emptySearches.map((s) => <li key={s.term} className="flex justify-between gap-3 py-2.5"><span className="truncate">{s.term}</span><span className="shrink-0 tabular-nums text-ink-400">{s.count} {s.count === 1 ? "vez" : "veces"}</span></li>)}</ul> : <p className="mt-3 text-sm text-ink-400">Ninguna búsqueda quedó sin resultados.</p>}
      </section>
    </div>

    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Demanda frente a oferta</h2><p className="mt-1 text-xs text-ink-400">Juegos que venden mucho en relación al stock publicado: oportunidad para captar vendedores.</p>
      {data.gaps.length ? <table className="mt-3 w-full text-left text-sm"><thead><tr><th scope="col" className="py-2">Juego</th><th scope="col" className="text-right">Vendidas</th><th scope="col" className="text-right">Stock activo</th><th scope="col" className="text-right">Rotación</th></tr></thead><tbody>{data.gaps.map((g) => <tr key={g.game} className="border-t border-ink-800"><td className="py-2.5">{gameName(g.game)}</td><td className="text-right tabular-nums">{g.sold}</td><td className="text-right tabular-nums">{g.stock}</td><td className="text-right tabular-nums">{(g.ratio * 100).toFixed(0)} %</td></tr>)}</tbody></table> : <p className="mt-3 text-sm text-ink-400">Sin ventas para comparar.</p>}
    </section>

    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Oferta publicada</h2>
      <table className="mt-3 w-full text-left text-sm"><thead><tr><th scope="col" className="py-2">Juego</th><th scope="col">Categoría</th><th scope="col" className="text-right">Publicaciones</th><th scope="col" className="text-right">Stock</th><th scope="col" className="text-right">Precio medio</th></tr></thead><tbody>{data.supply.map((s) => <tr key={`${s.game}-${s.type}`} className="border-t border-ink-800"><td className="py-2.5">{gameName(s.game)}</td><td>{TYPE_LABEL[s.type] ?? s.type}</td><td className="text-right tabular-nums">{s.listings}</td><td className="text-right tabular-nums">{s.stock}</td><td className="text-right tabular-nums">{clp(s.avgPrice)}</td></tr>)}</tbody></table>
    </section>

    <div className="grid gap-5 lg:grid-cols-3">
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Mejores vendedores</h2><ul className="mt-3 divide-y divide-ink-800 text-sm">{data.sellers.map((s, i) => <li key={i} className="flex justify-between gap-3 py-2.5"><span className="truncate">{s.name}</span><span className="shrink-0 tabular-nums text-ink-400">{clp(s.amount)}</span></li>)}</ul>{!data.sellers.length && <p className="mt-3 text-sm text-ink-400">Sin datos.</p>}</section>
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Estado de las órdenes</h2><ul className="mt-3 divide-y divide-ink-800 text-sm">{data.statuses.map((s) => <li key={s.status} className="flex justify-between py-2.5"><span>{STATUS_LABEL[s.status] ?? s.status}</span><span className="tabular-nums">{s.count}</span></li>)}</ul></section>
      <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Soporte técnico</h2><ul className="mt-3 divide-y divide-ink-800 text-sm">{data.tickets.map((t) => <li key={t.status} className="flex justify-between py-2.5"><span>{STATUS_LABEL[t.status] ?? t.status}</span><span className="tabular-nums">{t.count}</span></li>)}</ul>
        {data.ticketCategories.length > 0 && <p className="mt-3 text-xs text-ink-400">Motivos del periodo: {data.ticketCategories.map((c) => `${c.category.toLowerCase()} (${c.count})`).join(", ")}</p>}
        <Link href="/panel/soporte" className="mt-3 inline-block text-sm font-semibold text-brand-600 underline">Ir a los tickets</Link></section>
    </div>
    <p className="text-xs leading-relaxed text-ink-400">Para ver qué secciones de la página se usan más, revisa <Link href="/panel/analitica" className="underline">Analítica</Link>. Los montos excluyen órdenes canceladas y no equivalen a comisiones de la plataforma.</p>
  </div>;
}
