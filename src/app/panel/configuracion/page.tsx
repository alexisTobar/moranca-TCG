import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { safeQuery } from "@/lib/catalog";
import { PaymentSettingsForm } from "@/components/panel/PaymentSettingsForm";
import {
  PaymentDiscountManager,
  type PaymentDiscountValue,
} from "@/components/panel/PaymentDiscountManager";

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  // El menú ya oculta esta sección, pero la página también se protege acá.
  if (user.role !== "ADMIN") redirect("/panel");

  const [settings, discounts] = await Promise.all([
    getSiteSettings(),
    safeQuery(
      () =>
        prisma.paymentDiscount.findMany({
          orderBy: [{ method: "asc" }, { percent: "asc" }],
          select: { id: true, method: true, percent: true, label: true, active: true },
        }),
      [] as Array<{ id: string; method: string; percent: number; label: string | null; active: boolean }>
    ),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Pagos y descuentos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Tú decides si hay descuento por método de pago y de cuánto. Crea los que quieras y elige
          cuál se aplica; el cambio se ve al instante en el checkout de toda la tienda.
        </p>
      </header>

      <PaymentDiscountManager initial={discounts as PaymentDiscountValue[]} />
      <PaymentSettingsForm initialHours={settings.paymentWindowHours} />
    </div>
  );
}
