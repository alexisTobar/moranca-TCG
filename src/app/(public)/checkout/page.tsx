import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { CheckoutView } from "@/components/cart/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  // El middleware ya exige sesión para /checkout; esto es solo por si acaso.
  if (!user) return null;

  return <CheckoutView buyerName={user.name} buyerEmail={user.email} />;
}
