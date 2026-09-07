import type { Metadata } from "next";
import { CartPageView } from "@/components/cart/CartPageView";

export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageView />;
}
