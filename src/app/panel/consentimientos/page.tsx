import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function ConsentsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/panel");
  const params = await searchParams;
  const page = Math.floor(Math.min(100000, Math.max(1, Number(params.page) || 1)));
  const [rows, count] = await Promise.all([
    prisma.consentRecord.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, skip: (Math.floor(page) - 1) * 50, include: { user: { select: { name: true, email: true } } } }),
    prisma.consentRecord.count(),
  ]);
  return <div className="min-w-0 space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Privacidad y transparencia</p><h1 className="mt-2 font-display text-3xl font-bold">Registro de consentimientos</h1><p className="mt-3 max-w-2xl text-sm text-ink-400">Historial de aceptaciones, rechazos y cambios de preferencia. Cada evento conserva el texto mostrado, su versión y la fecha del servidor. Las decisiones anteriores no se sobrescriben.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl card-surface p-5"><p><strong>{count}</strong> decisiones registradas</p><a className="btn btn-secondary" href="/api/admin/consents">Descargar respaldo JSON</a></div>
    <p className="text-xs text-ink-400">Los registros anteriores a esta implementación permanecen en los campos de aceptación de cada cuenta; no se presentan como eventos nuevos. Este historial aporta trazabilidad, no certifica por sí solo el cumplimiento legal.</p>
    <a className="inline-flex text-sm font-semibold text-brand-700 underline underline-offset-4" href="/api/admin/consents?kind=legacy">Descargar aceptaciones guardadas en las cuentas (incluye historial anterior)</a>
    <div className="overflow-x-auto rounded-2xl card-surface"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Historial de decisiones de privacidad</caption><thead className="bg-ink-900"><tr>{["Fecha (Chile)", "Usuario / visitante", "Decisión", "Versión y origen", "Texto informado"].map(h => <th key={h} scope="col" className="p-4">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t border-ink-800"><td className="p-4 whitespace-nowrap">{r.createdAt.toLocaleString("es-CL", { timeZone: "America/Santiago" })}</td><td className="p-4"><p>{r.user?.name || "Visitante"}</p><p className="text-xs text-ink-400 break-all">{r.user?.email || r.subject}</p></td><td className="p-4"><span className={r.accepted ? "text-emerald-800" : "text-ink-400"}>{r.accepted ? "Aceptado" : "Rechazado / retirado"}</span><p className="text-xs">{r.kind === "terms" ? "Términos y privacidad" : "Estadísticas opcionales"}</p></td><td className="p-4 text-xs">{r.version}<br />{r.source}</td><td className="p-4 text-xs leading-relaxed">{r.statement}</td></tr>)}</tbody></table>{rows.length === 0 && <p className="p-8 text-center text-ink-400">Aún no hay decisiones registradas.</p>}</div>
    <nav aria-label="Páginas del historial" className="flex items-center gap-4">{page > 1 && <Link className="btn btn-secondary" href={`?page=${page - 1}`}>Anterior</Link>}<span className="text-sm">Página {page} de {Math.max(1, Math.ceil(count / 50))}</span>{page * 50 < count && <Link className="btn btn-secondary" href={`?page=${page + 1}`}>Siguiente</Link>}</nav>
  </div>;
}
