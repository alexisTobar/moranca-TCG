import { Info, TicketPercent } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { safeQuery } from "@/lib/catalog";
import { clp, timeAgo } from "@/lib/format";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { CouponManager } from "@/components/panel/CouponManager";
import { StatTile } from "@/components/charts/Charts";
import { EmptyState, PageHeader } from "@/components/panel/PageKit";

export const dynamic = "force-dynamic";

export default async function SellerDiscountsPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const [settings, coupons] = await Promise.all([
    getSiteSettings(),
    prisma.coupon.findMany({
      where: { sellerId: session.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Uso real de cada cupón: órdenes no canceladas que lo aplicaron.
  const usage = coupons.length ? await safeQuery(
    () => prisma.order.groupBy({
      by: ["couponId"],
      where: { couponId: { in: coupons.map((c) => c.id) }, status: { not: "CANCELLED" } },
      _count: { _all: true }, _sum: { couponDiscount: true, total: true }, _max: { createdAt: true },
    }),
    [] as Array<{ couponId: string | null; _count: { _all: number }; _sum: { couponDiscount: number | null; total: number | null }; _max: { createdAt: Date | null } }>
  ) : [];
  const usageOf = (id: string) => usage.find((u) => u.couponId === id);
  const totals = usage.reduce((acc, u) => ({ uses: acc.uses + u._count._all, discount: acc.discount + (u._sum.couponDiscount ?? 0), sales: acc.sales + (u._sum.total ?? 0) }), { uses: 0, discount: 0, sales: 0 });
  const ranked = coupons.map((c) => ({ c, u: usageOf(c.id) })).sort((a, b) => (b.u?._sum.total ?? 0) - (a.u?._sum.total ?? 0));

  const transferPct = discountPctFor(settings, "TRANSFER");
  const cashPct = discountPctFor(settings, "CASH");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Descuentos"
        description="Crea cupones para tu tienda y mide cuánto venden. El descuento por método de pago lo define la administración."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Cupones activos" value={String(coupons.filter((c) => c.active).length)} hint={`de ${coupons.length} creados`} />
        <StatTile label="Veces usados" value={totals.uses.toLocaleString("es-CL")} hint="en órdenes no canceladas" />
        <StatTile label="Descuento entregado" value={clp(totals.discount)} hint="lo que dejaste de cobrar" />
        <StatTile label="Ventas con cupón" value={clp(totals.sales)} hint={totals.discount ? `${(totals.sales / totals.discount).toFixed(1)} pesos vendidos por peso descontado` : "aún sin usos"} />
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2} />
        <p className="text-[13px] leading-relaxed text-ink-300">
          Además de tus cupones, los compradores reciben{" "}
          <strong className="text-carbon">{transferPct > 0 ? `${transferPct}% de descuento` : "sin descuento"}</strong>{" "}
          al pagar por transferencia y{" "}
          <strong className="text-carbon">{cashPct > 0 ? `${cashPct}% de descuento` : "sin descuento"}</strong>{" "}
          al pagar en efectivo al retirar.
        </p>
      </div>

      <CouponManager
        initial={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          active: c.active,
        }))}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold text-carbon">Rendimiento por cupón</h2>
        {coupons.length === 0 ? (
          <EmptyState icon={TicketPercent} title="Todavía no tienes cupones" text="Crea uno arriba (por ejemplo, BIENVENIDA10) y compártelo en tus redes. Aquí verás cuántas ventas genera." />
        ) : (
          <div className="overflow-x-auto rounded-2xl card-surface">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead className="border-b border-ink-800 text-[11px] uppercase tracking-wider text-ink-400">
                <tr><th className="p-3">Cupón</th><th className="p-3">Estado</th><th className="p-3 text-right">Usos</th><th className="p-3 text-right">Descuento</th><th className="p-3 text-right">Ventas</th><th className="p-3">Último uso</th></tr>
              </thead>
              <tbody>{ranked.map(({ c, u }) => <tr key={c.id} className="border-b border-ink-800 last:border-0">
                <td className="p-3"><span className="font-mono font-bold text-carbon">{c.code}</span> <span className="text-ink-400">· {c.type === "PERCENT" ? `${c.value}%` : clp(c.value)}</span></td>
                <td className="p-3">{c.active ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Activo</span> : <span className="rounded-full bg-ink-850 px-2 py-0.5 text-[11px] font-bold text-ink-400">Pausado</span>}</td>
                <td className="p-3 text-right tabular-nums">{u?._count._all ?? 0}</td>
                <td className="p-3 text-right tabular-nums">{clp(u?._sum.couponDiscount ?? 0)}</td>
                <td className="p-3 text-right font-semibold tabular-nums text-carbon">{clp(u?._sum.total ?? 0)}</td>
                <td className="p-3 text-ink-400">{u?._max.createdAt ? timeAgo(u._max.createdAt) : "Nunca"}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
