import { Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { CouponManager } from "@/components/panel/CouponManager";

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

  const transferPct = discountPctFor(settings, "TRANSFER");
  const cashPct = discountPctFor(settings, "CASH");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Descuentos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Crea cupones para tu tienda. El descuento por método de pago lo define la
          administración de la tienda.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-900 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" strokeWidth={2} />
        <p className="text-[13px] leading-relaxed text-ink-300">
          Ahora mismo los compradores reciben{" "}
          <strong className="text-carbon">
            {transferPct > 0 ? `${transferPct}% de descuento` : "sin descuento"}
          </strong>{" "}
          al pagar por transferencia y{" "}
          <strong className="text-carbon">
            {cashPct > 0 ? `${cashPct}% de descuento` : "sin descuento"}
          </strong>{" "}
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
    </div>
  );
}
