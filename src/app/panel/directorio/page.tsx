import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clp } from "@/lib/format";
import { StatTile } from "@/components/charts/Charts";
import { EmptyState, FilterTabs, PageHeader, Pager, SearchBox } from "@/components/panel/PageKit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Directorio de usuarios", robots: { index: false } };

const TABS = [
  { id: "compradores", label: "Compradores" },
  { id: "vendedores", label: "Vendedores" },
  { id: "tiendas", label: "Vendedores con tienda" },
] as const;
type Tab = (typeof TABS)[number]["id"];
const TAKE = 50;
const SOLD = ["PAID", "SHIPPED", "DELIVERED"] as const;

const fmt = (d: Date) => d.toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" });

/** Solo administración: quién está registrado como comprador, vendedor o vendedor con tienda, y cuánto mueve cada uno. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar?sesion=expirada");
  if (user.role !== "ADMIN") redirect("/panel");

  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "compradores";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const requestedPage = Math.max(1, Number(sp.page) || 1);

  const search: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] }
    : {};
  const tabWhere = (t: Tab): Prisma.UserWhereInput =>
    t === "compradores" ? { role: "BUYER" }
    : t === "vendedores" ? { role: "SELLER" }
    : { role: { in: ["SELLER", "ADMIN"] }, store: { isNot: null } };
  const where: Prisma.UserWhereInput = { AND: [tabWhere(tab), search] };
  const since = new Date(Date.now() - 30 * 86_400_000);

  let counts: number[], total: number, rows, summary: { all: number; new30: number; verified: number; buyersWithOrders: number };
  try {
    [counts, total, summary] = await Promise.all([
      Promise.all(TABS.map((t) => prisma.user.count({ where: { AND: [tabWhere(t.id), search] } }))),
      prisma.user.count({ where }),
      Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: since } } }),
        prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
        prisma.user.count({ where: { role: "BUYER", buyerOrders: { some: { status: { in: [...SOLD] } } } } }),
      ]).then(([all, new30, verified, buyersWithOrders]) => ({ all, new30, verified, buyersWithOrders })),
    ]);
    const pages = Math.max(1, Math.ceil(total / TAKE));
    rows = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.min(requestedPage, pages) - 1) * TAKE,
      take: TAKE,
      select: {
        id: true, name: true, email: true, role: true, active: true, city: true, region: true,
        emailVerifiedAt: true, createdAt: true, slug: true, totpEnabledAt: true,
        _count: { select: { listings: true, buyerOrders: true } },
        store: { select: { status: true, activeUntil: true, plan: { select: { name: true } } } },
      },
    });
  } catch {
    return <div className="rounded-2xl card-surface p-8"><h1 className="text-2xl font-bold">Directorio no disponible</h1><p className="mt-3">No fue posible leer los usuarios. Revisa la conexión a la base de datos.</p></div>;
  }

  // Movimiento de dinero de las filas visibles: lo gastado como comprador o lo vendido como vendedor.
  const ids = rows.map((r) => r.id);
  const money = ids.length ? await prisma.order.groupBy({
    by: [tab === "compradores" ? "buyerId" : "sellerId"],
    where: { status: { in: [...SOLD] }, [tab === "compradores" ? "buyerId" : "sellerId"]: { in: ids } },
    _sum: { total: true }, _count: { _all: true },
  }).catch(() => []) : [];
  const moneyOf = (id: string) => (money as Array<{ buyerId?: string | null; sellerId?: string | null; _sum: { total: number | null }; _count: { _all: number } }>)
    .find((m) => (tab === "compradores" ? m.buyerId : m.sellerId) === id);

  const pages = Math.max(1, Math.ceil(total / TAKE));
  const page = Math.min(requestedPage, pages);
  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab, q: q || undefined, ...patch })) if (v) params.set(k, v);
    return `/panel/directorio?${params}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Solo administración" title="Directorio de usuarios" description="Compradores, vendedores y vendedores con tienda, con su actividad. Esta información no es visible para nadie más." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Usuarios registrados" value={summary.all.toLocaleString("es-CL")} hint={`${counts[0]} compradores · ${counts[1]} vendedores`} />
        <StatTile label="Nuevos en 30 días" value={summary.new30.toLocaleString("es-CL")} />
        <StatTile label="Correo verificado" value={`${summary.all ? Math.round((100 * summary.verified) / summary.all) : 0}%`} hint={`${summary.verified} de ${summary.all}`} />
        <StatTile label="Compradores que compraron" value={summary.buyersWithOrders.toLocaleString("es-CL")} hint="con al menos una compra pagada" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label="Tipo de usuario" active={tab} tabs={TABS.map((t, i) => ({ key: t.id, label: t.label, count: counts[i], href: href({ tab: t.id, page: undefined }) }))} />
        <SearchBox action="/panel/directorio" defaultValue={q} placeholder="Buscar por nombre, correo o ciudad" keep={{ tab }} />
      </div>

      {rows.length ? (
        <section className="overflow-x-auto rounded-2xl card-surface">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="border-b border-ink-800 text-[11px] uppercase tracking-wider text-ink-400">
              <tr>
                <th scope="col" className="p-3">Usuario</th>
                <th scope="col" className="p-3">Ubicación</th>
                <th scope="col" className="p-3">Registro</th>
                <th scope="col" className="p-3 text-right">{tab === "compradores" ? "Compras" : "Publicaciones"}</th>
                <th scope="col" className="p-3 text-right">{tab === "compradores" ? "Gastado" : "Vendido"}</th>
                {tab === "tiendas" && <th scope="col" className="p-3">Plan</th>}
                <th scope="col" className="p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const m = moneyOf(u.id);
                return <tr key={u.id} className="border-b border-ink-800 last:border-0">
                  <td className="p-3">
                    <p className="font-semibold text-carbon">{u.role === "BUYER" ? u.name : <Link href={`/vendedor/${u.slug}`} className="hover:underline">{u.name}</Link>}</p>
                    <p className="text-[12px] text-ink-400">{u.email}{!u.emailVerifiedAt && <span className="ml-1 rounded bg-amber-500/10 px-1 text-[10.5px] font-semibold text-amber-800">sin verificar</span>}{u.totpEnabledAt && <span className="ml-1 rounded bg-emerald-500/10 px-1 text-[10.5px] font-semibold text-emerald-700">2 pasos</span>}</p>
                  </td>
                  <td className="p-3 text-ink-300">{[u.city, u.region].filter(Boolean).join(", ") || "—"}</td>
                  <td className="whitespace-nowrap p-3 text-ink-300">{fmt(u.createdAt)}</td>
                  <td className="p-3 text-right tabular-nums">{tab === "compradores" ? (m?._count._all ?? 0) : u._count.listings}</td>
                  <td className="p-3 text-right font-semibold tabular-nums text-carbon">{clp(m?._sum.total ?? 0)}</td>
                  {tab === "tiendas" && <td className="p-3">{u.store?.plan?.name ?? "—"}{u.store?.activeUntil ? <span className="block text-[12px] text-ink-400">hasta {fmt(u.store.activeUntil)}</span> : null}</td>}
                  <td className="p-3">{!u.active
                    ? <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-700">Desactivado</span>
                    : u.store?.status === "SUSPENDED"
                      ? <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-800">Tienda suspendida</span>
                      : <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Activo</span>}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </section>
      ) : <EmptyState icon={Users} title={q ? "Sin resultados" : "No hay usuarios en esta lista"} text={q ? "Prueba con otro nombre, correo o ciudad." : "Cuando alguien se registre en esta categoría aparecerá aquí."} />}

      <Pager page={page} pages={pages} total={total} take={TAKE} href={(p) => href({ page: String(p) })} />
    </div>
  );
}
