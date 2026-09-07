"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CartItem } from "./CartProvider";
import { clp } from "@/lib/format";

type Props = Omit<CartItem, "quantity">;

export function AddToCartPanel(props: Props) {
  const { add, items } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  const inCart = items.find((i) => i.listingId === props.listingId)?.quantity ?? 0;
  const soldOut = props.maxStock <= 0;
  const remaining = Math.max(0, props.maxStock - inCart);

  return (
    <div className="mt-5 rounded-2xl card-surface p-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <span className="font-display text-4xl font-bold text-accent-400">
          {clp(props.price)}
        </span>
        {qty > 1 && (
          <span className="text-[13px] text-ink-400">Total {clp(props.price * qty)}</span>
        )}
      </div>

      <p className="mt-1 text-[12px] text-ink-400">
        {soldOut ? (
          <span className="font-semibold text-brand-600">Sin stock disponible</span>
        ) : (
          <>
            {props.maxStock}{" "}
            {props.maxStock === 1 ? "unidad disponible" : "unidades disponibles"}
            {inCart > 0 && (
              <span className="text-accent-400"> · {inCart} en tu carrito</span>
            )}
          </>
        )}
      </p>

      {!soldOut && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-ink-700">
              <button
                type="button"
                onClick={() => setQty((v) => Math.max(1, v - 1))}
                className="px-3 py-2 text-ink-300 transition hover:text-accent-300"
                aria-label="Restar unidad"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-semibold text-ink-200">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((v) => Math.min(remaining || 1, v + 1))}
                className="px-3 py-2 text-ink-300 transition hover:text-accent-300"
                aria-label="Sumar unidad"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={remaining <= 0}
              onClick={() => add(props, qty)}
              className="flex-1 rounded-xl border border-accent-500/60 bg-accent-500/10 px-6 py-3 text-sm font-bold text-accent-300 transition hover:bg-accent-500/20 disabled:opacity-50"
            >
              {remaining <= 0 ? "Ya tienes todo el stock" : "Agregar al carrito"}
            </button>
          </div>

          <button
            type="button"
            disabled={remaining <= 0 && inCart === 0}
            onClick={() => {
              if (remaining > 0) add(props, qty);
              router.push("/checkout");
            }}
            className="mt-2.5 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-50"
          >
            Comprar ahora
          </button>

          <p className="mt-3 text-center text-[11px] text-ink-400">
            Pago protegido con Mercado Pago · Despacho a todo Chile
          </p>
        </>
      )}
    </div>
  );
}

export function AddToCartMini(props: Props) {
  const { add } = useCart();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(props, 1);
      }}
      disabled={props.maxStock <= 0}
      className="w-full rounded-lg border border-ink-700 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:border-accent-500/60 hover:text-accent-300 disabled:opacity-40"
    >
      Agregar
    </button>
  );
}
