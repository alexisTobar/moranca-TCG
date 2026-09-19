import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { discountPctFor, getSiteSettings } from "@/lib/site-settings";
import { CheckoutView } from "@/components/cart/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  // El middleware ya exige sesión para /checkout; esto es solo por si acaso.
  if (!user) return null;

  const settings = await getSiteSettings();

  return (
    <CheckoutView
      buyerName={user.name}
      buyerEmail={user.email}
      transferDiscountPct={discountPctFor(settings, "TRANSFER")}
      cashDiscountPct={discountPctFor(settings, "CASH")}
      paymentWindowHours={settings.paymentWindowHours}
    />
  );
}
