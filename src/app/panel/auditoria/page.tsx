import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { AUDIT_LABELS } from "@/lib/audit";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "todo", label: "Todo" },
  { key: "admin", label: "Administración" },
  { key: "seguridad", label: "Seguridad de cuentas" },
] as const;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");

  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.tipo) ?? FILTERS[0];

  const rows = await prisma.auditLog.findMany({
    where:
      filter.key === "seguridad"
        ? { action: { startsWith: "security." } }
        : filter.key === "admin"
          ? { NOT: { action: { startsWith: "security." } } }
          : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-5xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Auditoría</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Registro de lo que hace el equipo administrador y de los cambios de seguridad de las cuentas. Muestra los últimos 200 eventos.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/panel/auditoria?tipo=${f.key}`} data-active={filter.key === f.key} className="pill">
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-14 text-center">
          <ShieldCheck className="h-10 w-10 text-ink-500" strokeWidth={1.5} />
          <p className="mt-3 font-display text-lg font-bold text-carbon">Todavía no hay eventos</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl card-surface">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-800 text-[11px] uppercase tracking-wider text-ink-400">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Quién</th>
                <th className="px-4 py-3 font-semibold">Qué hizo</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-400">
                    {r.createdAt.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" })}
                  </td>
                  <td className="px-4 py-3 font-semibold text-carbon">{r.actorName}</td>
                  <td className="px-4 py-3 text-ink-300">{AUDIT_LABELS[r.action] ?? r.action}</td>
                  <td className="max-w-md break-words px-4 py-3 text-ink-400">{r.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
