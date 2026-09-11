import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DiscountRatesForm } from "@/components/panel/DiscountRatesForm";
import { CouponManager } from "@/components/panel/CouponManager";

export const dynamic = "force-dynamic";

export default async function SellerDiscountsPage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const [user, coupons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { transferDiscountPct: true, cashDiscountPct: true },
    }),
    prisma.coupon.findMany({
      where: { sellerId: session.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Descuentos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Configura cuánto descuento das según el método de pago y crea cupones
          para tu tienda.
        </p>
      </header>

      <DiscountRatesForm initial={user} />
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
