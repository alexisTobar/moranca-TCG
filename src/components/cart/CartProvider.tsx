"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlyToCartLayer, type Flight } from "./FlyToCart";

export interface CartItem {
  listingId: string;
  slug: string;
  title: string;
  price: number;
  imageUrl: string | null;
  game: string;
  type: string;
  maxStock: number;
  sellerName: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  ready: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** El botón del carrito en el header se registra acá para saber hacia dónde animar. */
  registerCartIcon: (el: HTMLElement | null) => void;
  /** Lanza la animación de "vuela al carrito" desde el elemento clickeado. */
  flyToCart: (imageUrl: string | null | undefined, fromEl: HTMLElement) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "dreamdeck_cart_v1";

function readStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) => i && typeof i.listingId === "string" && typeof i.price === "number"
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const cartIconRef = useRef<HTMLElement | null>(null);

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    cartIconRef.current = el;
  }, []);

  const flyToCart = useCallback(
    (imageUrl: string | null | undefined, fromEl: HTMLElement) => {
      const iconEl = cartIconRef.current;
      if (!iconEl) return;
      const from = fromEl.getBoundingClientRect();
      const to = iconEl.getBoundingClientRect();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFlights((prev) => [...prev, { id, imageUrl: imageUrl ?? null, from, to }]);
      // Se limpia sola: nada depende de este timer más que sacar el nodo del DOM.
      setTimeout(() => {
        setFlights((prev) => prev.filter((f) => f.id !== id));
      }, 700);
    },
    []
  );

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items, ready]);

  const add = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.listingId === item.listingId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            ...item,
            quantity: Math.min(item.maxStock, next[idx].quantity + quantity),
          };
          return next;
        }
        return [...prev, { ...item, quantity: Math.min(item.maxStock, quantity) }];
      });
    },
    []
  );

  const setQuantity = useCallback((listingId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.listingId === listingId
            ? { ...i, quantity: Math.max(0, Math.min(i.maxStock, quantity)) }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const remove = useCallback((listingId: string) => {
    setItems((prev) => prev.filter((i) => i.listingId !== listingId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((a, i) => a + i.quantity, 0);
    const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
    return {
      items,
      count,
      subtotal,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      open,
      setOpen,
      registerCartIcon,
      flyToCart,
    };
  }, [items, ready, add, setQuantity, remove, clear, open, registerCartIcon, flyToCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <FlyToCartLayer flights={flights} />
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
