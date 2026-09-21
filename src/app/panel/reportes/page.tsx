import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ReportsAdmin, type AdminReport } from "@/components/panel/ReportsAdmin";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/panel");

  const rows = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 150,
  });
  const listingIds = rows.filter((r) => r.targetType === "LISTING").map((r) => r.targetId);
  const userIds = [...new Set([...rows.filter((r) => r.targetType === "USER").map((r) => r.targetId), ...rows.map((r) => r.reporterId)])];
  const [listings, users] = await Promise.all([
    prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true, slug: true, status: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, slug: true, active: true } }),
  ]);
  const L = new Map(listings.map((l) => [l.id, l]));
  const U = new Map(users.map((u) => [u.id, u]));

  const reports: AdminReport[] = rows.map((r) => {
    const l = L.get(r.targetId);
    const u = U.get(r.targetId);
    return {
      id: r.id,
      targetType: r.targetType as "LISTING" | "USER",
      targetLabel: r.targetType === "LISTING" ? l?.title ?? "Publicación eliminada" : u?.name ?? "Usuario eliminado",
      targetHref: r.targetType === "LISTING" ? (l ? `/producto/${l.slug}` : null) : u ? `/vendedor/${u.slug}` : null,
      targetStatus: r.targetType === "LISTING" ? l?.status ?? null : u ? (u.active ? "activo" : "suspendido") : null,
      reporter: U.get(r.reporterId)?.name ?? "Usuario eliminado",
      reason: r.reason,
      detail: r.detail,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Reportes</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Publicaciones y vendedores denunciados por la comunidad. Puedes resolver con o sin medida, o descartar.
        </p>
      </header>
      <ReportsAdmin reports={reports} />
    </div>
  );
}
