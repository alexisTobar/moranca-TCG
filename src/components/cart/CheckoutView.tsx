"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Landmark, CreditCard } from "lucide-react";
import { useCart } from "./CartProvider";
import { clp } from "@/lib/format";
import { REGIONS, comunasOf, PICKUP_POINT, type ShippingMethod } from "@/lib/regions";
import { BANK_TRANSFER, TRANSFER_DISCOUNT_RATE } from "@/lib/bank";

type PaymentMethod = "TRANSFER" | "MERCADOPAGO";

export function CheckoutView() {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();

  const [method, setMethod] = useState<ShippingMethod>("SHIPPING");
  const [payment, setPayment] = useState<PaymentMethod>("TRANSFER");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: string; notice?: string } | null>(null);

  const comunas = useMemo(() => comunasOf(region), [region]);
  const ship = 0; // todo despacho es por pagar directo al courier, no se cobra acá
  const discount =
    payment === "TRANSFER" ? Math.round(subtotal * TRANSFER_DISCOUNT_RATE) : 0;
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
          Orden #{done.orderId.slice(-6).toUpperCase()} creada
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-400">
          {done.notice ??
            "Te contactaremos al correo indicado para coordinar el pago y el despacho."}
        </p>
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
          buyerName: form.get("buyerName"),
          buyerEmail: form.get("buyerEmail"),
          buyerPhone: form.get("buyerPhone"),
          paymentMethod: payment,
          shipMethod: method,
          shipRegion: method === "SHIPPING" ? region : null,
          shipCity: method === "SHIPPING" ? comuna : null,
          shipAddress: method === "SHIPPING" ? form.get("shipAddress") : null,
          notes: form.get("notes"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar la orden");

      clear();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      setDone({ orderId: data.orderId, notice: data.notice });
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
        Enviamos a todo Chile. Completa tus datos y elige cómo quieres recibir tu pedido.
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {/* PAGO */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">1 · Método de pago</h2>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPayment("TRANSFER")}
                className={`relative rounded-xl border p-4 text-left transition ${
                  payment === "TRANSFER"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  -2% dcto
                </span>
                <Landmark
                  className={`h-4 w-4 ${payment === "TRANSFER" ? "text-accent-400" : "text-ink-400"}`}
                  strokeWidth={2}
                />
                <span
                  className={`mt-1.5 block text-[13px] font-bold ${
                    payment === "TRANSFER" ? "text-accent-300" : "text-ink-200"
                  }`}
                >
                  Transferencia bancaria
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-400">
                  Confirmamos el pago con tu comprobante
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPayment("MERCADOPAGO")}
                className={`rounded-xl border p-4 text-left transition ${
                  payment === "MERCADOPAGO"
                    ? "border-accent-500/60 bg-accent-500/10"
                    : "border-ink-700 hover:border-ink-600"
                }`}
              >
                <CreditCard
                  className={`h-4 w-4 ${payment === "MERCADOPAGO" ? "text-accent-400" : "text-ink-400"}`}
                  strokeWidth={2}
                />
                <span
                  className={`mt-1.5 block text-[13px] font-bold ${
                    payment === "MERCADOPAGO" ? "text-accent-300" : "text-ink-200"
                  }`}
                >
                  Mercado Pago
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-400">
                  Tarjetas, débito y transferencia por Mercado Pago
                </span>
              </button>
            </div>

            {payment === "TRANSFER" && (
              <div className="mt-4 rounded-xl border border-ink-700 bg-ink-950 p-4 text-[12px] text-ink-300">
                <p className="font-semibold text-ink-200">Datos para transferir</p>
                <dl className="mt-2 space-y-1">
                  <Row label="Banco" value={BANK_TRANSFER.bank} />
                  <Row label="Cuenta" value={`${BANK_TRANSFER.accountType} N° ${BANK_TRANSFER.accountNumber}`} />
                  <Row label="RUT" value={BANK_TRANSFER.rut} />
                  <Row label="Titular" value={BANK_TRANSFER.holderName} />
                  <Row label="Enviar comprobante a" value={BANK_TRANSFER.email} />
                </dl>
                <p className="mt-3 text-[11px] text-ink-400">
                  Al confirmar, te dejamos estos datos junto con el número de
                  orden. Despachamos apenas confirmemos tu pago.
                </p>
              </div>
            )}
          </section>

          {/* CONTACTO */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">2 · Tus datos</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="buyerName" label="Nombre y apellido" required />
              <Field name="buyerEmail" label="Email" type="email" required />
              <Field
                name="buyerPhone"
                label="Teléfono"
                placeholder="+56 9 1234 5678"
                className="sm:col-span-2"
              />
            </div>
          </section>

          {/* ENTREGA */}
          <section className="rounded-2xl card-surface p-5">
            <h2 className="text-sm font-semibold text-carbon">3 · Entrega</h2>

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
            <h2 className="text-sm font-semibold text-carbon">4 · Comentario</h2>
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
                : payment === "TRANSFER"
                  ? `Confirmar orden · ${clp(total)}`
                  : `Pagar ${clp(total)}`}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
              {payment === "TRANSFER"
                ? "Te mostramos los datos de la cuenta al confirmar. Despachamos apenas llegue tu comprobante."
                : "Pago procesado por Mercado Pago. Tus datos viajan cifrados y no almacenamos información de tarjetas."}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right font-medium text-ink-200">{value}</dd>
    </div>
  );
}
