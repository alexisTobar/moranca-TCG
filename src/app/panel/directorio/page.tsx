import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Directorio de usuarios", robots: { index: false } };

const TABS = [
  { id: "compradores", label: "Compradores" },
  { id: "vendedores", label: "Vendedores" },
  { id: "tiendas", label: "Vendedores con tienda" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const fmt = (d: Date) => d.toLocaleDateString("es-CL", { year: "numeric", month: "short", day: "numeric" });

/** Solo administración: quién está registrado como comprador, vendedor o vendedor con tienda. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  if (user.role !== "ADMIN") redirect("/panel");

  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "compradores";
  const q = (sp.q ?? "").trim().slice(0, 60);

  const search: Prisma.UserWhereInput = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
    : {};
  const where: Prisma.UserWhereInput =
    tab === "compradores" ? { role: "BUYER", ...search }
    : tab === "vendedores" ? { role: "SELLER", ...search }
    : { role: { in: ["SELLER", "ADMIN"] }, store: { isNot: null }, ...search };

  let counts: [number, number, number];
  let rows;
  try {
    [counts, rows] = await Promise.all([
      Promise.all([
        prisma.user.count({ where: { role: "BUYER" } }),
        prisma.user.count({ where: { role: "SELLER" } }),
        prisma.user.count({ where: { role: { in: ["SELLER", "ADMIN"] }, store: { isNot: null } } }),
      ]),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true, name: true, email: true, role: true, active: true, city: true, phone: true,
          emailVerifiedAt: true, createdAt: true, slug: true,
          _count: { select: { listings: true, buyerOrders: true } },
          store: { select: { status: true, activeUntil: true, plan: { select: { name: true } } } },
        },
      }),
    ]);
  } catch {
    return <div className="rounded-2xl card-surface p-8"><h1 className="text-2xl font-bold">Directorio no disponible</h1><p className="mt-3">No fue posible leer los usuarios. Revisa la conexión a la base de datos.</p></div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Solo administración</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Directorio de usuarios</h1>
        <p className="mt-2 text-sm text-ink-400">Compradores, vendedores y vendedores con tienda. Esta información no es visible para nadie más.</p>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Tipo de usuario" className="flex flex-wrap gap-1.5">
          {TABS.map((t, i) => (
            <Link key={t.id} href={`/panel/directorio?tab=${t.id}`} aria-current={t.id === tab ? "page" : undefined} className={`btn btn-sm ${t.id === tab ? "btn-primary" : "btn-secondary"}`}>
              {t.label} ({counts[i]})
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/panel/directorio">
          <input type="hidden" name="tab" value={tab} />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre o correo" aria-label="Buscar" className="input w-64" />
          <button className="btn btn-secondary btn-sm">Buscar</button>
        </form>
      </div>

      <section className="overflow-x-auto rounded-2xl card-surface p-2">
        {rows.length ? (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-ink-400">
                <th scope="col" className="p-3">Nombre</th>
                <th scope="col">Correo</th>
                <th scope="col">Ciudad</th>
                <th scope="col">Registro</th>
                <th scope="col" className="text-right">{tab === "compradores" ? "Compras" : "Publicaciones"}</th>
                {tab === "tiendas" && <th scope="col">Plan</th>}
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-ink-800">
                  <td className="p-3 font-medium">{u.role === "BUYER" ? u.name : <Link href={`/vendedor/${u.slug}`} className="hover:underline">{u.name}</Link>}</td>
                  <td>{u.email}{!u.emailVerifiedAt && <span className="ml-1 text-xs text-ink-400">(sin verificar)</span>}</td>
                  <td>{u.city ?? "—"}</td>
                  <td className="whitespace-nowrap">{fmt(u.createdAt)}</td>
                  <td className="text-right tabular-nums">{tab === "compradores" ? u._count.buyerOrders : u._count.listings}</td>
                  {tab === "tiendas" && <td>{u.store?.plan?.name ?? "—"}{u.store?.activeUntil ? ` · hasta ${fmt(u.store.activeUntil)}` : ""}</td>}
                  <td>{!u.active ? "Desactivado" : u.store?.status === "SUSPENDED" ? "Tienda suspendida" : "Activo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="p-4 text-sm text-ink-400">No hay usuarios en esta lista.</p>}
      </section>
      {rows.length === 200 && <p className="text-xs text-ink-400">Se muestran los 200 más recientes; usa el buscador para encontrar a otros.</p>}
    </div>
  );
}
