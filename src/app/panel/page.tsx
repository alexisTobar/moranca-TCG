import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";
import { GameChip } from "@/components/GameChip";
import { getPanelCounts } from "@/lib/panel-counts";
import { CreditCard, Flag, LifeBuoy, Mail, Package, ShieldAlert, UserPlus, type LucideIcon } from "lucide-react";
import { BarList, Breakdown, ChartCard, SERIES_COLORS, StatTile, delta } from "@/components/charts/Charts";
import { TimeSeriesChart } from "@/components/charts/TimeSeriesChart";
import { GAMES } from "@/lib/games";
import { STATUS_LABELS, marketplaceMetrics, salesMetrics, shortDay, topViewedListings } from "@/lib/panel-metrics";

/** Color fijo por estado: el mismo estado tiene siempre el mismo color. */
const STATUS_COLORS: Record<string, string> = {
  PENDING: SERIES_COLORS[3], PAID: SERIES_COLORS[0], SHIPPED: SERIES_COLORS[2], DELIVERED: SERIES_COLORS[5], CANCELLED: SERIES_COLORS[7],
};
const gameName = (game: string) => GAMES[game as keyof typeof GAMES]?.short ?? game;

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isAdmin = user.role === "ADMIN";
  const scope = isAdmin ? {} : { sellerId: user.id };

  const [active, drafts, sold, totalValue, recent, pendingOrders] = await Promise.all([
    safeQuery(
      () => prisma.listing.count({ where: { ...scope, status: "ACTIVE" } }),
      0
    ),
    safeQuery(
      () => prisma.listing.count({ where: { ...scope, status: "DRAFT" } }),
      0
    ),
    safeQuery(() => prisma.listing.count({ where: { ...scope, status: "SOLD" } }), 0),
    safeQuery(
      () =>
        prisma.listing.aggregate({
          where: { ...scope, status: "ACTIVE" },
          _sum: { price: true },
        }),
      { _sum: { price: null } } as { _sum: { price: number | null } }
    ),
    safeQuery(
      () =>
        prisma.listing.findMany({
          where: scope,
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            slug: true,
            title: true,
            game: true,
            price: true,
            status: true,
            imageUrl: true,
            createdAt: true,
          },
        }),
      [] as Array<{
        id: string;
        slug: string;
        title: string;
        game: string;
        price: number;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
      }>
    ),
    safeQuery(
      async () =>
        isAdmin ? prisma.order.count({ where: { status: "PENDING" } }) : 0,
      0
    ),
  ]);

  const [pending, sales, viewed, market] = await Promise.all([
    getPanelCounts(user),
    safeQuery(() => salesMetrics(isAdmin ? null : user.id), null),
    safeQuery(() => topViewedListings(isAdmin ? null : user.id), []),
    isAdmin ? safeQuery(() => marketplaceMetrics(), null) : Promise.resolve(null),
  ]);
  const adminNo2fa =
    isAdmin && !(await prisma.user.findUnique({ where: { id: user.id }, select: { totpEnabledAt: true } }))?.totpEnabledAt;
  const attention: Array<{ href: string; icon: LucideIcon; n: number; text: string }> = [
    { href: "/panel/tiendas", icon: CreditCard, n: pending.subscriptions, text: "pagos de membresía por revisar" },
    { href: "/panel/soporte", icon: LifeBuoy, n: pending.tickets, text: isAdmin ? "tickets con mensajes nuevos" : "respuestas de soporte sin leer" },
    { href: "/panel/usuarios", icon: UserPlus, n: pending.sellerRequests, text: "solicitudes para ser vendedor" },
    { href: "/panel/reportes", icon: Flag, n: pending.reports, text: "reportes por revisar" },
    { href: "/panel/contacto", icon: Mail, n: pending.contact, text: "consultas de contacto sin responder" },
    { href: "/panel/ordenes", icon: Package, n: pending.orders, text: "órdenes con comprobante por confirmar" },
  ].filter((a) => a.n > 0);

  const stats = [
    { label: "Publicaciones activas", value: String(active), href: "/panel/publicaciones" },
    { label: "Borradores", value: String(drafts), href: "/panel/publicaciones?status=DRAFT" },
    { label: "Vendidas", value: String(sold), href: "/panel/publicaciones?status=SOLD" },
    {
      label: "Valor en catálogo",
      value: clp(totalValue._sum.price ?? 0),
      href: "/panel/publicaciones",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">
            Hola, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {isAdmin
              ? "Tienes control total sobre publicaciones, perfiles y órdenes."
              : "Administra tus publicaciones en TCG Cardeck."}
          </p>
        </div>
        <Link
          href="/panel/publicar"
          className="btn btn-primary btn-sm"
        >
          + Nueva publicación
        </Link>
      </header>

      {adminNo2fa && (
        <Link
          href="/panel/perfil"
          className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/[0.07] p-4 text-[13px] text-ink-300 transition hover:bg-amber-500/10"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-700" strokeWidth={2} />
          <span>
            <strong className="text-carbon">Protege tu cuenta de administrador.</strong> Activa la verificación en dos pasos: controlas pagos y usuarios.
          </span>
        </Link>
      )}

      {attention.length > 0 && (
        <section aria-label="Requiere tu atención" className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4">
          <p className="font-display text-sm font-bold text-carbon">Requiere tu atención</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {attention.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-xl bg-white px-3.5 py-3 text-[13px] font-medium text-ink-300 shadow-sm transition hover:shadow-md"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                  <a.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span>
                  <strong className="font-display text-base text-carbon">{a.n}</strong> {a.text}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {isAdmin && pendingOrders > 0 && (
        <Link
          href="/panel/ordenes"
          className="block rounded-xl border border-ink-700 bg-ink-900 p-4 text-[13px] text-ink-300 transition hover:bg-ink-850"
        >
          Tienes <strong>{pendingOrders}</strong>{" "}
          {pendingOrders === 1 ? "orden pendiente" : "órdenes pendientes"} por revisar →
        </Link>
      )}

      {sales && <section aria-labelledby="sales-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="sales-title" className="font-display text-xl font-bold text-carbon">{isAdmin ? "Ventas del marketplace" : "Tus ventas"}</h2>
          <p className="text-[12px] text-ink-400">Últimos 30 días frente a los 30 anteriores · ventas con pago confirmado</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Ventas" value={clp(sales.total)} change={delta(sales.total, sales.prevTotal)} hint={`antes ${clp(sales.prevTotal)}`} trend={sales.amount} />
          <StatTile label="Órdenes pagadas" value={sales.orders.toLocaleString("es-CL")} change={delta(sales.orders, sales.prevOrders)} hint={`antes ${sales.prevOrders}`} trend={sales.count} color={SERIES_COLORS[1]} href="/panel/ordenes" />
          <StatTile label="Ticket promedio" value={clp(sales.avgTicket)} change={delta(sales.avgTicket, sales.prevAvgTicket)} hint="por orden" />
          <StatTile label="Por despachar" value={String(sales.pendingShip)} hint={sales.rating != null ? `Calificación ${sales.rating.toFixed(1)} ★ (${sales.reviewCount})` : "pagadas sin enviar"} href="/panel/ordenes" />
        </div>
        <ChartCard title="Ventas por día" subtitle="Monto de las órdenes con pago confirmado, en hora de Chile">
          <TimeSeriesChart title="Ventas por día" labels={sales.keys.map(shortDay)} series={[{ name: "Ventas", values: sales.amount, color: SERIES_COLORS[0] }]} format="clp" />
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Órdenes por estado" subtitle="Órdenes creadas en los últimos 30 días">
            <Breakdown parts={sales.statuses.map((s) => ({ label: STATUS_LABELS[s.status], value: s.n, color: STATUS_COLORS[s.status] }))} />
          </ChartCard>
          <ChartCard title="Ventas por juego" subtitle="Monto vendido en cada juego">
            <BarList rows={sales.byGame.map((g) => ({ label: gameName(g.game), value: g.amount }))} format={clp} />
          </ChartCard>
          <ChartCard title="Lo más vendido" subtitle="Por monto, con unidades vendidas">
            <BarList rows={sales.topProducts.map((p) => ({ label: p.title, value: p.amount, sub: `${p.qty} u.` }))} format={clp} color={SERIES_COLORS[1]} />
          </ChartCard>
          <ChartCard title="Publicaciones más vistas" subtitle="Visitas acumuladas a la ficha">
            <BarList rows={viewed.map((l) => ({ label: l.title, value: l.views, href: `/panel/publicaciones/${l.id}`, sub: `stock ${l.stock}` }))} format={(n) => `${n.toLocaleString("es-CL")} vistas`} color={SERIES_COLORS[2]} empty="Tus publicaciones aún no registran visitas" />
          </ChartCard>
        </div>
      </section>}

      {market && <section aria-labelledby="market-title" className="space-y-4">
        <h2 id="market-title" className="font-display text-xl font-bold text-carbon">Crecimiento del marketplace</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Cuentas nuevas" value={market.signupTotal.toLocaleString("es-CL")} change={delta(market.signupTotal, market.prevSignups)} hint={`${market.totals.users.toLocaleString("es-CL")} activas en total`} trend={market.signups} href="/panel/directorio" />
          <StatTile label="Publicaciones nuevas" value={market.listingTotal.toLocaleString("es-CL")} change={delta(market.listingTotal, market.prevListings)} hint={`${market.totals.listings.toLocaleString("es-CL")} activas`} trend={market.listings} color={SERIES_COLORS[1]} />
          <StatTile label="Vendedores con stock" value={market.totals.active_sellers.toLocaleString("es-CL")} hint={`de ${market.totals.sellers} vendedores`} href="/panel/usuarios" />
          <StatTile label="Valor del inventario" value={clp(market.totals.stock_value)} hint="precio × stock activo" />
        </div>
        <ChartCard title="Altas por día" subtitle="Cuentas creadas y publicaciones nuevas (misma unidad: cantidad por día)">
          <TimeSeriesChart title="Altas por día" labels={market.keys.map(shortDay)} series={[
            { name: "Cuentas nuevas", values: market.signups, color: SERIES_COLORS[0] },
            { name: "Publicaciones nuevas", values: market.listings, color: SERIES_COLORS[1] },
          ]} />
        </ChartCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Vendedores que más venden" subtitle="Monto con pago confirmado en 30 días">
            <BarList rows={market.topSellers.map((s) => ({ label: s.name, value: s.amount, sub: `${s.orders} órdenes`, href: `/vendedor/${s.slug}` }))} format={clp} />
          </ChartCard>
          <ChartCard title="Lo que más buscan" subtitle="Búsquedas del catálogo en 30 días" action={<Link href="/panel/analitica" className="text-[12px] font-semibold text-brand-600">Analítica</Link>}>
            <BarList rows={market.searches.map((s) => ({ label: s.term, value: s.n }))} color={SERIES_COLORS[2]} empty="Aún no hay búsquedas registradas" />
          </ChartCard>
        </div>
      </section>}

      <h2 className="font-display text-xl font-bold text-carbon">{isAdmin ? "Catálogo" : "Tu catálogo"}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-2xl card-surface p-5 transition hover:border-carbon"
          >
            <p className="text-[11px] uppercase tracking-widest text-ink-400">
              {s.label}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-carbon">{s.value}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-xl font-bold text-carbon">
            Últimas publicaciones
          </h2>
          <Link
            href="/panel/publicaciones"
            className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver todas →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-700 p-12 text-center">
            <p className="text-sm text-ink-400">Todavía no has publicado nada.</p>
            <Link
              href="/panel/publicar"
              className="btn btn-primary btn-sm mt-3 inline-block"
            >
              Crear la primera publicación
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
            {recent.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/panel/publicaciones/${l.id}`}
                  className="flex items-center gap-4 p-3.5 transition hover:bg-ink-850/60"
                >
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950">
                    {l.imageUrl && (
                      <Image
                        src={l.imageUrl}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
            unoptimized
          />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink-200">
                      {l.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <GameChip game={l.game} />
                      <span className="text-[11px] text-ink-400">
                        {timeAgo(l.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-sm font-bold text-accent-400">
                      {clp(l.price)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-ink-400">
                      {l.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
