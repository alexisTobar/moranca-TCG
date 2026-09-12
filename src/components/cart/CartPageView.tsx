"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./CartProvider";
import { clp } from "@/lib/format";
import { GameChip } from "@/components/GameChip";

export function CartPageView() {
  const { items, subtotal, setQuantity, remove, clear, count, ready } = useCart();

  if (!ready) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-sm text-ink-400">Cargando…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <ShoppingCart className="h-16 w-16 text-ink-600" strokeWidth={1.25} />
        <h1 className="mt-6 font-display text-3xl font-bold text-carbon">
          Tu carrito está vacío
        </h1>
        <p className="mt-2 text-[14px] text-ink-400">
          Agrega cartas, sellados o mazos y vuelve aquí para completar tu compra.
        </p>
        <Link
          href="/cartas"
          className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper transition hover:bg-brand-500"
        >
          Explorar catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-carbon">Tu carrito</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            {count} {count === 1 ? "producto" : "productos"}
          </p>
        </div>
        <button
          onClick={clear}
          className="text-[12px] font-semibold text-ink-400 transition hover:text-brand-600"
        >
          Vaciar carrito
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
          {items.map((item) => (
            <li key={item.listingId} className="flex gap-4 p-4">
              <Link
                href={`/producto/${item.slug}`}
                className="relative h-[104px] w-[74px] shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-950"
              >
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="74px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/producto/${item.slug}`}
                  className="line-clamp-2 text-[14px] font-semibold text-ink-200 hover:text-carbon"
                >
                  {item.title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <GameChip game={item.game} />
                  <span className="text-[11px] text-ink-400">{item.sellerName}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-lg border border-ink-700">
                    <button
                      onClick={() => setQuantity(item.listingId, item.quantity - 1)}
                      className="px-2.5 py-1.5 text-ink-300 transition hover:text-carbon"
                      aria-label="Quitar una unidad"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-[13px] font-semibold text-ink-200">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(item.listingId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="px-2.5 py-1.5 text-ink-300 transition hover:text-carbon disabled:opacity-30"
                      aria-label="Agregar una unidad"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[11px] text-ink-400">
                    {item.maxStock} disponibles
                  </span>
                  <button
                    onClick={() => remove(item.listingId)}
                    className="text-[11px] font-semibold text-ink-400 transition hover:text-brand-600"
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {item.originalPrice != null && item.originalPrice > item.price && (
                  <p className="text-[11px] text-ink-500 line-through">
                    {clp(item.originalPrice * item.quantity)}
                  </p>
                )}
                <p className="font-display text-lg font-bold text-accent-400">
                  {clp(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[11px] text-ink-400">{clp(item.price)} c/u</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl card-surface p-5 lg:sticky lg:top-40">
          <h2 className="text-sm font-semibold text-carbon">Resumen</h2>

          <dl className="mt-4 space-y-2 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-ink-400">Subtotal</dt>
              <dd className="font-semibold text-ink-200">{clp(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Despacho</dt>
              <dd className="text-ink-400">Por pagar al recibir</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg border border-ink-700 bg-ink-950 p-3 text-[12px] text-ink-300">
            El despacho lo cobra el courier directo a quien recibe. Retiro en
            persona siempre es gratis.
          </p>

          <Link
            href="/checkout"
            className="mt-5 block rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-paper transition hover:bg-brand-500"
          >
            Continuar al pago
          </Link>
          <Link
            href="/cartas"
            className="mt-2 block rounded-xl border border-ink-700 py-2.5 text-center text-[13px] font-semibold text-ink-200 transition hover:border-carbon"
          >
            Seguir comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
