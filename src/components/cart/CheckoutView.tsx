"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, Landmark, MessageCircle } from "lucide-react";
import { useCart } from "./CartProvider";
import { clp } from "@/lib/format";
import { REGIONS, comunasOf, PICKUP_POINT, type ShippingMethod } from "@/lib/regions";

const TRANSFER_DISCOUNT_RATE = 0.02;
type PayMethod = "TRANSFER" | "MP";

interface OrderResult {
  orderId: string;
  sellerName: string;
  total: number;
  notice: string;
}

export function CheckoutView({
  buyerName,
  buyerEmail,
  mpEnabled,
}: {
  buyerName: string;
  buyerEmail: string;
  /** Si Mercado Pago está configurado en el servidor (MP_ACCESS_TOKEN). */
  mpEnabled: boolean;
}) {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();

  const [method, setMethod] = useState<ShippingMethod>("SHIPPING");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderResult[] | null>(null);

  // Mercado Pago cobra a través de una sola cuenta (la del sitio), así que
  // solo se puede ofrecer cuando todas las cartas del carrito son del mismo
  // vendedor. Con varios vendedores, cada uno necesita su propia orden y su
  // propia transferencia.
  const sellerIds = useMemo(
    () => new Set(items.map((i) => i.sellerId).filter(Boolean)),
    [items]
  );
  const singleSeller = sellerIds.size === 1;
  const mpAvailable = mpEnabled && singleSeller;

  const [payMethod, setPayMethod] = useState<PayMethod>("TRANSFER");
  const effectivePayMethod: PayMethod = payMethod === "MP" && !mpAvailable ? "TRANSFER" : payMethod;

  const comunas = useMemo(() => comunasOf(region), [region]);
  const ship = 0; // todo despacho es por pagar directo al courier, no se cobra acá
  const discount =
    effectivePayMethod === "TRANSFER" ? Math.round(subtotal * TRANSFER_DISCOUNT_RATE) : 0;
  const total = subtotal - discount + ship;

  if (!ready) {
    return <p className="px-4 py-16 text-sm text-ink-400">Cargando…</p>;
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold text-carbon">
          {done.length > 1 ? `${done.length} órdenes creadas` : "Orden creada"}
        </h1>
        <p className="mt-3 text-[13px] text-ink-400">
          {done.length > 1
            ? "Tu carrito tenía cartas de más de un vendedor, así que quedó separado en una orden por cada uno."
            : "Sigue los datos de transferencia de abajo."}
        </p>

        <div className="mt-6 w-full space-y-4 text-left">
          {done.map((o) => (
            <div key={o.orderId} className="rounded-2xl card-surface p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-ink-200">{o.sellerName}</p>
                <span className="text-[11px] font-semibold text-ink-400">
                  #{o.orderId.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-300">{o.notice}</p>
              <Link
                href="/cuenta"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-300 hover:text-accent-400"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
                Mandar el comprobante en Mi cuenta →
              </Link>
            </div>
          ))}
        </div>

        <Link
          href="/cartas"
          className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-carbon">
          No hay productos para pagar
        </h1>
        <Link
          href="/cartas"
          className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-paper"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (method === "SHIPPING" && (!region || !comuna)) {
      setError("Selecciona región y comuna para el despacho.");
      return;
    }

    const form = new FormData(e.currentTarget);
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
          shipMethod: method,
          shipRegion: method === "SHIPPING" ? region : null,
          shipCity: method === "SHIPPING" ? comuna : null,
          shipAddress: method === "SHIPPING" ? form.get("shipAddress") : null,
          notes: form.get("notes"),
          paymentMethod: effectivePayMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar la orden");

      if (data.initPoint) {
        // Mercado Pago: la orden ya quedó creada, ahora se paga en su checkout.
        clear();
        window.location.href = data.initPoint as string;
        return;
      }

      clear();
      setDone(data.orders as OrderResult[]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-4 text-[12px] text-ink-400">
        <Link href="/carrito" className="hover:text-accent-300">
          Carrito
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">Checkout</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-carbon">Finalizar compra</h1>
      <p className="mt-1 text-[13px] text-ink-400">
        Comprando como <strong className="text-ink-200">{buyerName}</strong> ({buyerEmail})
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* PAGO */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">1 · Método de pago</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayMethod("TRANSFER")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                  effectivePayMethod === "TRANSFER"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <Landmark className="h-4 w-4 shrink-0 text-accent-400" strokeWidth={2} />
                <div>
                  <p
                    className={`text-[13px] font-bold ${
                      effectivePayMethod === "TRANSFER" ? "text-accent-300" : "text-ink-200"
                    }`}
                  >
                    Transferencia bancaria · -2% dcto
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    Te mostramos la cuenta de cada vendedor al confirmar (si tu
                    carrito tiene más de uno, se separa en una orden por cada
                    cual). Le mandas el comprobante desde <strong>Mi cuenta</strong>.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={!mpAvailable}
                onClick={() => setPayMethod("MP")}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  effectivePayMethod === "MP"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <CreditCard className="h-4 w-4 shrink-0 text-accent-400" strokeWidth={2} />
                <div>
                  <p
                    className={`text-[13px] font-bold ${
                      effectivePayMethod === "MP" ? "text-accent-300" : "text-ink-200"
                    }`}
                  >
                    Mercado Pago
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {!mpEnabled
                      ? "No disponible por ahora."
                      : !singleSeller
                        ? "Solo cuando compras a un único vendedor."
                        : "Tarjetas, saldo en cuenta u otros medios de Mercado Pago. Precio sin descuento."}
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* ENTREGA */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">2 · Entrega</h2>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("SHIPPING")}
                className={`rounded-xl border p-4 text-left transition ${
                  method === "SHIPPING"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <span
                  className={`block text-[13px] font-bold ${
                    method === "SHIPPING" ? "text-accent-300" : "text-ink-200"
                  }`}
                >
                  Despacho a domicilio · Por pagar
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-400">
                  El flete lo cobra el courier directo a quien recibe
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMethod("PICKUP")}
                className={`rounded-xl border p-4 text-left transition ${
                  method === "PICKUP"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <span
                  className={`block text-[13px] font-bold ${
                    method === "PICKUP" ? "text-accent-300" : "text-ink-200"
                  }`}
                >
                  Retiro en persona · gratis
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-400">
                  {PICKUP_POINT}
                </span>
              </button>
            </div>

            {method === "SHIPPING" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    País
                  </span>
                  <input
                    value="Chile"
                    readOnly
                    disabled
                    className="w-full rounded-lg border border-ink-800 bg-ink-900 px-3 py-2.5 text-sm text-ink-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Región <span className="text-accent-400">*</span>
                  </span>
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setComuna("");
                    }}
                    required
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
                  >
                    <option value="">Selecciona tu región…</option>
                    {REGIONS.map((r) => (
                      <option key={r.code} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Comuna <span className="text-accent-400">*</span>
                  </span>
                  <select
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    required
                    disabled={!region}
                    className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70 disabled:opacity-50"
                  >
                    <option value="">
                      {region ? "Selecciona tu comuna…" : "Elige una región primero"}
                    </option>
                    {comunas.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <Field
                  name="shipAddress"
                  label="Dirección"
                  placeholder="Calle, número, depto."
                  required
                />
              </div>
            )}
          </section>

          {/* COMENTARIO */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">3 · Comentario</h2>
            <textarea
              name="notes"
              rows={3}
              placeholder="Indicaciones para la entrega, horario de contacto, etc. (opcional)"
              className="mt-3 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-accent-500/70"
            />
          </section>
        </div>

        {/* RESUMEN */}
        <aside className="h-fit space-y-4 lg:sticky lg:top-40">
          <div className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">Tu pedido</h2>

            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.listingId} className="flex gap-3">
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-ink-700 bg-ink-950">
                    {i.imageUrl && (
                      <Image
                        src={i.imageUrl}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                        unoptimized
                      />
                    )}
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-paper">
                      {i.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[12px] font-medium text-ink-200">
                      {i.title}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-ink-300">
                    {clp(i.price * i.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2 border-t border-ink-800 pt-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-400">Subtotal</dt>
                <dd className="text-ink-200">{clp(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Descuento transferencia (2%)</dt>
                  <dd className="text-emerald-700">-{clp(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-400">
                  {method === "PICKUP" ? "Retiro" : "Despacho"}
                </dt>
                <dd className={method === "PICKUP" ? "text-emerald-700" : "text-ink-400"}>
                  {method === "PICKUP" ? "Gratis" : "Por pagar"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-800 pt-3">
                <dt className="font-semibold text-ink-200">Total</dt>
                <dd className="font-display text-xl font-bold text-accent-400">
                  {clp(total)}
                </dd>
              </div>
            </dl>

            {error && (
              <p className="mt-4 rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-brand-600">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
            >
              {loading
                ? "Procesando…"
                : effectivePayMethod === "MP"
                  ? `Pagar con Mercado Pago · ${clp(total)}`
                  : `Confirmar orden · ${clp(total)}`}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
              {effectivePayMethod === "MP"
                ? "Te llevamos al checkout seguro de Mercado Pago. Despachamos apenas se confirme el pago."
                : "Te mostramos los datos de la cuenta al confirmar. Despachamos apenas confirmemos tu comprobante en el chat de la orden."}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
        {required && <span className="text-accent-400"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none transition focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20"
      />
    </label>
  );
}
