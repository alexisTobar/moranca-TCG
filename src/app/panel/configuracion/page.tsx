import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { PaymentSettingsForm } from "@/components/panel/PaymentSettingsForm";

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  // El menú ya oculta esta sección, pero la página también se protege acá.
  if (user.role !== "ADMIN") redirect("/panel");

  const settings = await getSiteSettings();

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Pagos y descuentos</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Tú decides si hay descuento por método de pago y de cuánto. El cambio se aplica al
          instante en el checkout de toda la tienda.
        </p>
      </header>
      <PaymentSettingsForm initial={settings} />
    </div>
  );
}
