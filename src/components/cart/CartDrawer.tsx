"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCart } from "./CartProvider";
import { clp } from "@/lib/format";

export function CartButton() {
  const { count, setOpen, ready } = useCart();

  return (
    <button
      onClick={() => setOpen(true)}
      aria-label={`Abrir carrito (${count} productos)`}
      className="relative rounded-lg border border-ink-700 px-3 py-2 text-[13px] font-medium text-ink-200 transition hover:border-accent-500/60 hover:text-accent-300"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-paper">
          {count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const { items, subtotal, open, setOpen, setQuantity, remove, count } = useCart();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-carbon/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-label="Carrito de compras"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-ink-700 bg-ink-900 shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-ink-800 px-5 py-4">
          <h2 className="font-display text-lg font-bold text-carbon">
            Tu carrito{" "}
            <span className="text-[13px] font-normal text-ink-400">
              ({count} {count === 1 ? "producto" : "productos"})
            </span>
          </h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar carrito"
            className="rounded-lg border border-ink-700 p-1.5 text-ink-300 transition hover:text-carbon"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="text-5xl opacity-40">🛒</span>
            <p className="text-sm text-ink-400">Tu carrito está vacío.</p>
            <Link
              href="/cartas"
              onClick={() => setOpen(false)}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-paper"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-ink-800 overflow-y-auto">
              {items.map((item) => (
                <li key={item.listingId} className="flex gap-3 p-4">
                  <Link
                    href={`/producto/${item.slug}`}
                    onClick={() => setOpen(false)}
                    className="relative h-[76px] w-[54px] shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950"
                  >
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        sizes="54px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/producto/${item.slug}`}
                      onClick={() => setOpen(false)}
                      className="line-clamp-2 text-[13px] font-semibold text-ink-200 hover:text-accent-300"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink-400">{item.sellerName}</p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-ink-700">
                        <button
                          onClick={() =>
                            setQuantity(item.listingId, item.quantity - 1)
                          }
                          className="px-2 py-1 text-ink-300 transition hover:text-accent-300"
                          aria-label="Quitar una unidad"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-[12px] font-semibold text-ink-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity(item.listingId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxStock}
                          className="px-2 py-1 text-ink-300 transition hover:text-accent-300 disabled:opacity-30"
                          aria-label="Agregar una unidad"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => remove(item.listingId)}
                        className="text-[11px] text-ink-400 transition hover:text-brand-600"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>

                  <span className="shrink-0 text-right font-display text-sm font-bold text-accent-400">
                    {clp(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="border-t border-ink-800 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-300">Subtotal</span>
                <span className="font-display text-xl font-bold text-accent-400">
                  {clp(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                El despacho se calcula en el siguiente paso.
              </p>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                className="mt-4 block rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-paper transition hover:bg-brand-500"
              >
                Ir a pagar
              </Link>
              <Link
                href="/carrito"
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-xl border border-ink-700 py-2.5 text-center text-[13px] font-semibold text-ink-200 transition hover:border-accent-500/60"
              >
                Ver carrito completo
              </Link>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
