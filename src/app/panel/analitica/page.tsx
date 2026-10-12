import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { usageSummary } from "@/lib/usage";
import { utcDay } from "@/lib/usage-policy";
import { clp } from "@/lib/format";

export const dynamic = "force-dynamic";
export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.role !== "ADMIN") redirect("/panel");
  const end = new Date(utcDay().getTime() + 86400000);
  let summary, reports;
  try {
    [summary, reports] = await Promise.all([
      usageSummary(new Date(end.getTime() - 30 * 86400000), end),
      prisma.usageReport.findMany({ orderBy: { weekStart: "desc" }, take: 52, select: { weekStart: true, weekEnd: true, createdAt: true } }),
    ]);
  } catch {
    return <div className="rounded-2xl card-surface p-8"><h1 className="text-2xl font-bold">Analítica no disponible</h1><p className="mt-3">No fue posible leer las estadísticas. Comprueba la conexión y que las tablas del último despliegue estén creadas.</p></div>;
  }
  const maxViews = Math.max(1, ...summary.days.map((d) => d.views));
  return <div className="space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-600">Solo administración</p><h1 className="mt-2 font-display text-3xl font-bold">Uso de la aplicación</h1><p className="mt-2 text-sm text-ink-400">Últimos 30 días, incluidos hoy. Fechas agrupadas en UTC.</p></div><a href="/api/admin/analytics" className="btn btn-secondary btn-sm">Descargar informe JSON</a></header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[
      ["Visitas consentidas", summary.views.toLocaleString("es-CL")], ["Sesiones diarias acumuladas", summary.dailySessions.toLocaleString("es-CL")],
      ["Cuentas registradas", summary.registrations], ["Órdenes creadas", summary.orders], ["Pagos confirmados", summary.paidOrders], ["Monto confirmado", clp(summary.paidAmount)],
    ].map(([label, value]) => <div key={label} className="rounded-2xl card-surface p-5"><p className="text-xs text-ink-400">{label}</p><p className="mt-3 font-display text-3xl font-bold">{value}</p></div>)}</div>
    <p className="text-xs leading-relaxed text-ink-400">Las visitas incluyen solo navegadores que aceptaron estadísticas; no representan a todos los usuarios. El identificador cambia cada día: las sesiones acumuladas no son personas únicas. Los registros y pagos se calculan desde las operaciones reales, sin exponer datos personales. Los montos excluyen órdenes canceladas y no equivalen a ingresos netos ni a comisiones de la plataforma.</p>
    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Visitas por día</h2>{summary.days.length ? <div className="mt-5 space-y-2">{summary.days.map((d) => <div key={d.day} className="grid grid-cols-[90px_1fr_45px] items-center gap-3 text-xs"><span>{d.day}</span><div className="h-3 overflow-hidden rounded-full bg-ink-850"><div className="h-full rounded-full bg-brand-600" style={{ width: `${100 * d.views / maxViews}%` }} /></div><span className="text-right">{d.views}</span></div>)}</div> : <p className="mt-3 text-sm text-ink-400">Todavía no hay visitas consentidas registradas.</p>}</section>
    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Secciones más visitadas</h2><table className="mt-3 w-full text-left text-sm"><thead><tr><th scope="col" className="py-2">Sección</th><th scope="col">Visitas</th></tr></thead><tbody>{summary.pages.map((p) => <tr key={p.page} className="border-t border-ink-800"><td className="py-3 capitalize">{p.page}</td><td>{p.views}</td></tr>)}</tbody></table></section>
    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Informes semanales</h2><p className="mt-2 text-sm text-ink-400">Semanas de lunes a domingo (UTC). Se generan los lunes al ejecutarse la tarea programada. Conservación: 52 semanas.</p>{reports.length ? <ul className="mt-4 divide-y divide-ink-800">{reports.map((r) => <li key={r.weekStart.toISOString()} className="flex justify-between gap-3 py-3 text-sm"><span>Semana del {r.weekStart.toISOString().slice(0, 10)}</span><a className="font-semibold text-brand-600 underline" href={`/api/admin/analytics?week=${r.weekStart.toISOString().slice(0, 10)}`}>Descargar</a></li>)}</ul> : <p className="mt-4 text-sm">Aún no se ha generado ningún informe semanal.</p>}</section>
    <section className="rounded-2xl card-surface p-5"><h2 className="font-bold">Respaldo de la base de datos</h2><p className="mt-2 text-sm text-ink-400">El respaldo cifrado se ejecuta por separado en GitHub Actions. Este panel no confirma su ejecución: verifica el resultado de “Respaldo semanal” y descarga el archivo desde el repositorio. El informe de uso no reemplaza una copia de la base de datos.</p></section>
  </div>;
}
