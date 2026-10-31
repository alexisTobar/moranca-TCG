import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { usageSummary } from "@/lib/usage";
import { utcDay } from "@/lib/usage-policy";
import { clp } from "@/lib/format";
import { BarList, ChartCard, SERIES_COLORS, StatTile, delta } from "@/components/charts/Charts";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { marketplaceMetrics, salesMetrics, shortDay } from "@/lib/panel-metrics";

export const dynamic = "force-dynamic";

const PAGE_LABELS: Record<string, string> = {
  inicio: "Inicio", catalogo: "Catálogo", producto: "Ficha de producto", carta: "Ficha de carta", tiendas: "Tiendas", tienda: "Tienda",
  vendedores: "Vendedores", vendedor: "Perfil de vendedor", carrito: "Carrito", checkout: "Checkout", cuenta: "Mi cuenta",
  noticias: "Noticias", ayuda: "Ayuda", legal: "Páginas legales",
};

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.role !== "ADMIN") redirect("/panel");
  const end = new Date(utcDay().getTime() + 86400000);
  const start = new Date(end.getTime() - 30 * 86400000);
  let summary, previous, reports, market, sales;
  try {
    [summary, previous, reports, market, sales] = await Promise.all([
      usageSummary(start, end),
      usageSummary(new Date(start.getTime() - 30 * 86400000), start),
      prisma.usageReport.findMany({ orderBy: { weekStart: "desc" }, take: 52, select: { weekStart: true, weekEnd: true, createdAt: true } }),
      marketplaceMetrics(),
      salesMetrics(null),
    ]);
  } catch {
    return <div className="rounded-2xl card-surface p-8"><h1 className="text-2xl font-bold">Analítica no disponible</h1><p className="mt-3">No fue posible leer las estadísticas. Comprueba la conexión y que las tablas del último despliegue estén creadas.</p></div>;
  }

  // Serie diaria completa (los días sin visitas cuentan como 0), en UTC como los eventos de uso.
  const dayKeys = Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10));
  const byDay = new Map(summary.days.map((d) => [d.day, d]));
  const views = dayKeys.map((k) => byDay.get(k)?.views ?? 0);
  const sessions = dayKeys.map((k) => byDay.get(k)?.sessions ?? 0);
  const pageViews = (page: string) => summary.pages.find((p) => p.page === page)?.views ?? 0;
  const funnel = [
    { label: "Catálogo y fichas de carta", value: pageViews("catalogo") + pageViews("carta") },
    { label: "Ficha de producto", value: pageViews("producto") },
    { label: "Carrito", value: pageViews("carrito") },
    { label: "Checkout", value: pageViews("checkout") },
  ];
  const conversion = summary.dailySessions ? (100 * summary.paidOrders) / summary.dailySessions : 0;

  return <div className="space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Solo administración</p><h1 className="mt-2 font-display text-3xl font-bold">Uso de la aplicación</h1><p className="mt-2 text-sm text-ink-400">Últimos 30 días, incluido hoy, frente a los 30 anteriores.</p></div>
      <a href="/api/admin/analytics" className="btn btn-secondary btn-sm">Descargar informe JSON</a>
    </header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <StatTile label="Visitas consentidas" value={summary.views.toLocaleString("es-CL")} change={delta(summary.views, previous.views)} hint={`antes ${previous.views.toLocaleString("es-CL")}`} trend={views} />
      <StatTile label="Sesiones diarias" value={summary.dailySessions.toLocaleString("es-CL")} change={delta(summary.dailySessions, previous.dailySessions)} hint={summary.dailySessions ? `${(summary.views / summary.dailySessions).toFixed(1)} páginas por sesión` : undefined} trend={sessions} color={SERIES_COLORS[1]} />
      <StatTile label="Cuentas registradas" value={summary.registrations.toLocaleString("es-CL")} change={delta(summary.registrations, previous.registrations)} trend={market.signups} color={SERIES_COLORS[2]} href="/panel/directorio" />
      <StatTile label="Órdenes creadas" value={summary.orders.toLocaleString("es-CL")} change={delta(summary.orders, previous.orders)} href="/panel/ordenes" />
      <StatTile label="Pagos confirmados" value={summary.paidOrders.toLocaleString("es-CL")} change={delta(summary.paidOrders, previous.paidOrders)} hint={summary.dailySessions ? `${conversion.toFixed(1)}% de las sesiones` : undefined} trend={sales.count} color={SERIES_COLORS[1]} />
      <StatTile label="Monto confirmado" value={clp(summary.paidAmount)} change={delta(summary.paidAmount, previous.paidAmount)} hint={`antes ${clp(previous.paidAmount)}`} trend={sales.amount} />
    </div>

    <ChartCard title="Visitas y sesiones por día" subtitle="Solo navegadores que aceptaron estadísticas · días en UTC">
      <TimeSeriesChart title="Visitas y sesiones por día" labels={dayKeys.map(shortDay)} series={[
        { name: "Visitas", values: views, color: SERIES_COLORS[0] },
        { name: "Sesiones", values: sessions, color: SERIES_COLORS[1] },
      ]} />
    </ChartCard>

    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Recorrido de compra" subtitle="Visitas a cada paso; la caída entre pasos muestra dónde se pierde gente">
        <BarList rows={funnel} format={(n) => `${n.toLocaleString("es-CL")} visitas`} />
        {funnel[0].value > 0 && <p className="mt-4 text-[12px] text-ink-400">Del catálogo al checkout llega el <strong className="text-carbon">{((100 * funnel[3].value) / funnel[0].value).toFixed(1)}%</strong> de las visitas.</p>}
      </ChartCard>
      <ChartCard title="Secciones más visitadas">
        <BarList rows={summary.pages.slice(0, 8).map((p) => ({ label: PAGE_LABELS[p.page] ?? p.page, value: p.views }))} color={SERIES_COLORS[2]} empty="Todavía no hay visitas consentidas registradas" />
      </ChartCard>
    </div>

    <ChartCard title="Actividad real por día" subtitle="Calculada desde las operaciones (todas las personas, no solo las que aceptaron estadísticas) · hora de Chile">
      <TimeSeriesChart title="Actividad real por día" labels={market.keys.map(shortDay)} series={[
        { name: "Cuentas nuevas", values: market.signups, color: SERIES_COLORS[0] },
        { name: "Publicaciones nuevas", values: market.listings, color: SERIES_COLORS[1] },
        { name: "Órdenes pagadas", values: sales.count, color: SERIES_COLORS[2] },
      ]} />
    </ChartCard>

    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Lo que más buscan" subtitle="Términos del buscador en 30 días">
        <BarList rows={market.searches.map((s) => ({ label: s.term, value: s.n, href: `/cartas?q=${encodeURIComponent(s.term)}` }))} format={(n) => `${n} búsquedas`} empty="Aún no hay búsquedas registradas" />
      </ChartCard>
      <ChartCard title="Búsquedas sin resultados" subtitle="Lo que la gente quiere y no encuentra: oportunidades de stock">
        <BarList rows={market.noResults.map((s) => ({ label: s.term, value: s.n }))} format={(n) => `${n} búsquedas`} color={SERIES_COLORS[1]} empty="Todas las búsquedas encontraron algo" />
      </ChartCard>
    </div>

    <p className="text-xs leading-relaxed text-ink-400">Las visitas incluyen solo navegadores que aceptaron estadísticas; no representan a todos los usuarios. El identificador cambia cada día: las sesiones acumuladas no son personas únicas, y el porcentaje de pagos por sesión es una aproximación. Los registros, órdenes y pagos se calculan desde las operaciones reales, sin exponer datos personales. Los montos excluyen órdenes canceladas y no equivalen a ingresos netos ni a comisiones de la plataforma.</p>

    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Informes semanales</h2><p className="mt-2 text-sm text-ink-400">Semanas de lunes a domingo (UTC). Se generan los lunes al ejecutarse la tarea programada. Conservación: 52 semanas.</p>{reports.length ? <ul className="mt-4 divide-y divide-ink-800">{reports.map((r) => <li key={r.weekStart.toISOString()} className="flex justify-between gap-3 py-3 text-sm"><span>Semana del {r.weekStart.toISOString().slice(0, 10)}</span><a className="font-semibold text-brand-600 underline" href={`/api/admin/analytics?week=${r.weekStart.toISOString().slice(0, 10)}`}>Descargar</a></li>)}</ul> : <p className="mt-4 text-sm">Aún no se ha generado ningún informe semanal.</p>}</section>
    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Respaldo de la base de datos</h2><p className="mt-2 text-sm text-ink-400">El respaldo cifrado se ejecuta por separado en GitHub Actions. Este panel no confirma su ejecución: verifica el resultado de “Respaldo semanal” y descarga el archivo desde el repositorio. El informe de uso no reemplaza una copia de la base de datos.</p></section>
  </div>;
}
