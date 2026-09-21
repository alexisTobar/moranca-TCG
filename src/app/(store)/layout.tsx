import { CartProvider } from "@/components/cart/CartProvider";

/**
 * Las tiendas premium tienen su propio encabezado: aquí no va el menú de Win Condition.
 * Solo se comparte el carrito (es el mismo de todo el sitio, para poder comprar).
 */
export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
