"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Landmark,
  LockKeyhole,
  PackageCheck,
  Store,
  Timer,
  Truck,
} from "lucide-react";
import { useCart } from "./CartProvider";
import { clp } from "@/lib/format";
import { REGIONS, comunasOf, PICKUP_POINT, type ShippingMethod } from "@/lib/regions";
import {
  TransferInstructions,
  type BankInfo,
} from "@/components/account/TransferInstructions";

type PayMethod = "TRANSFER" | "CASH";

interface OrderResult {
  orderId: string;
  sellerName: string;
  total: number;
  method: PayMethod;
  reference: string | null;
  dueAt: string | null;
  discountPct: number;
  pickupPoint: string | null;
  bank: BankInfo | null;
}

interface QuoteSeller {
  sellerId: string;
  subtotal: number;
  couponDiscount: number;
  paymentDiscount: number;
  discount: number;
  total: number;
  shipCost: number;
}

function OptionCard({
  active,
  disabled,
  onClick,
  icon: Icon,
  title,
  description,
  badge,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  description: string;
  badge?: string | null;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex items-start gap-3.5 rounded-2xl border-2 p-4 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-brand-500 bg-brand-500/[0.04] shadow-[0_12px_30px_-18px_var(--color-brand-600)]"
          : "border-ink-800 bg-white hover:border-ink-600"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
          active ? "bg-brand-600 text-white" : "bg-ink-850 text-ink-400 group-hover:text-carbon"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-bold text-carbon">{title}</span>
          {badge && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-[12px] leading-relaxed text-ink-400">{description}</span>
      </span>
      <span
        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          active ? "border-brand-600 bg-brand-600" : "border-ink-600"
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[15px] font-bold text-carbon">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-carbon text-[12px] font-bold text-white">
        {n}
      </span>
      {children}
    </h2>
  );
}

export function CheckoutView({
  buyerName,
  buyerEmail,
  transferDiscountPct,
  cashDiscountPct,
  paymentWindowHours,
}: {
  buyerName: string;
  buyerEmail: string;
  /** Descuento vigente por transferencia (0 si el administrador lo desactivó). */
  transferDiscountPct: number;
  cashDiscountPct: number;
  paymentWindowHours: number;
}) {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();

  const [method, setMethod] = useState<ShippingMethod>("SHIPPING");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<OrderResult[] | null>(null);

  const sellerCount = useMemo(
    () => new Set(items.map((i) => i.sellerId).filter(Boolean)).size,
    [items]
  );

  const [payMethod, setPayMethod] = useState<PayMethod>("TRANSFER");
  const effectivePayMethod: PayMethod =
    payMethod === "CASH" && method !== "PICKUP" ? "TRANSFER" : payMethod;

  const comunas = useMemo(() => comunasOf(region), [region]);

  const [couponCode, setCouponCode] = useState("");
  const [quote, setQuote] = useState<QuoteSeller[] | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setQuote([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ listingId: i.listingId, quantity: i.quantity })),
            shipMethod: method,
            shipRegion: method === "SHIPPING" ? region : null,
            paymentMethod: effectivePayMethod,
            couponCode: couponCode.trim() || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setQuote(data.sellers as QuoteSeller[]);
          setCouponError(data.couponError ?? null);
        }
      } catch {
        /* la cotización es solo un preview; el checkout real recalcula todo */
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [items, method, region, effectivePayMethod, couponCode]);

  const couponDiscount = quote ? quote.reduce((a, s) => a + s.couponDiscount, 0) : 0;
  const paymentDiscount = quote ? quote.reduce((a, s) => a + s.paymentDiscount, 0) : 0;
  const total = quote ? quote.reduce((a, s) => a + s.total, 0) : subtotal;

  if (!ready) {
    return <p className="px-4 py-16 text-sm text-ink-400">Cargando…</p>;
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" strokeWidth={1.75} />
          </span>
          <h1 className="mt-5 font-display text-3xl font-bold text-carbon">
            {done.length > 1 ? `${done.length} órdenes creadas` : "Orden creada"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-ink-400">
            Tus cartas quedaron <strong className="text-carbon">reservadas</strong>.{" "}
            {done.length > 1
              ? "Tu carrito tenía cartas de más de un vendedor, así que quedó separado en una orden por cada uno. "
              : ""}
            Completa el pago siguiendo los pasos de abajo.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          {done.map((o) => (
            <div key={o.orderId} className="rounded-3xl card-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-800 pb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Vendedor
                  </p>
                  <p className="text-[15px] font-bold text-carbon">{o.sellerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                    Total a pagar
                  </p>
                  <p className="font-display text-2xl font-bold text-accent-400">{clp(o.total)}</p>
                  {o.discountPct > 0 && (
                    <p className="text-[11px] font-semibold text-emerald-700">
                      Incluye {o.discountPct}% de descuento
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-4">
                <TransferInstructions
                  payment={{
                    orderId: o.orderId,
                    method: o.method,
                    total: o.total,
                    reference: o.reference,
                    dueAt: o.dueAt,
                    bank: o.bank,
                    pickupPoint: o.pickupPoint,
                    receiptUploadedAt: null,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/cuenta" className="btn btn-dark">
            Ver mis compras
          </Link>
          <Link href="/cartas" className="btn btn-secondary">
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-carbon">No hay productos para pagar</h1>
        <Link href="/cartas" className="btn btn-primary mt-6">
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
          couponCode: couponCode.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar la orden");

      clear();
      setDone(data.orders as OrderResult[]);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-4 text-[12px] text-ink-400">
        <Link href="/carrito" className="hover:text-carbon">
          Carrito
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-300">Checkout</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-carbon sm:text-4xl">Finalizar compra</h1>
      <p className="mt-1 text-[13px] text-ink-400">
        Comprando como <strong className="text-ink-200">{buyerName}</strong> ({buyerEmail})
      </p>

      <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* PAGO */}
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <StepTitle n={1}>Método de pago</StepTitle>
            <div className="mt-5 grid gap-3">
              <OptionCard
                active={effectivePayMethod === "TRANSFER"}
                onClick={() => setPayMethod("TRANSFER")}
                icon={Landmark}
                title="Transferencia bancaria"
                badge={transferDiscountPct > 0 ? `${transferDiscountPct}% dcto.` : null}
                description={
                  sellerCount > 1
                    ? "Tu carrito tiene más de un vendedor: se separa en una orden por cada uno, con su propia cuenta."
                    : "Al confirmar te mostramos la cuenta del vendedor y un código de referencia para identificar tu pago."
                }
              />
              <OptionCard
                active={effectivePayMethod === "CASH"}
                disabled={method !== "PICKUP"}
                onClick={() => setPayMethod("CASH")}
                icon={Banknote}
                title="Efectivo al retirar"
                badge={cashDiscountPct > 0 ? `${cashDiscountPct}% dcto.` : null}
                description={
                  method !== "PICKUP"
                    ? "Solo disponible con retiro en persona."
                    : "Pagas en efectivo al retirar tu pedido."
                }
              />
            </div>

            <div className="mt-4 grid gap-2.5 rounded-2xl bg-ink-900 p-4 text-[12px] text-ink-300 sm:grid-cols-3">
              <p className="flex items-start gap-2">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} />
                Tus cartas quedan reservadas al confirmar.
              </p>
              <p className="flex items-start gap-2">
                <Timer className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} />
                Tienes {paymentWindowHours} horas para pagar.
              </p>
              <p className="flex items-start gap-2">
                <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" strokeWidth={2} />
                Despachamos al confirmarse el pago.
              </p>
            </div>
          </section>

          {/* ENTREGA */}
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <StepTitle n={2}>Entrega</StepTitle>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <OptionCard
                active={method === "SHIPPING"}
                onClick={() => setMethod("SHIPPING")}
                icon={Truck}
                title="Despacho a domicilio"
                description="Por pagar: el courier cobra el flete a quien recibe."
              />
              <OptionCard
                active={method === "PICKUP"}
                onClick={() => setMethod("PICKUP")}
                icon={Store}
                title="Retiro en persona"
                badge="Gratis"
                description={PICKUP_POINT}
              />
            </div>

            {method === "SHIPPING" && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">País</span>
                  <input value="Chile" readOnly disabled className="input bg-ink-900 text-ink-400" />
                </label>

                <label className="block">
                  <span className="field-label">
                    Región <span className="text-brand-600">*</span>
                  </span>
                  <select
                    value={region}
                    onChange={(e) => {
                      setRegion(e.target.value);
                      setComuna("");
                    }}
                    required
                    className="input"
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
                  <span className="field-label">
                    Comuna <span className="text-brand-600">*</span>
                  </span>
                  <select
                    value={comuna}
                    onChange={(e) => setComuna(e.target.value)}
                    required
                    disabled={!region}
                    className="input disabled:opacity-50"
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
          <section className="rounded-3xl card-surface p-5 sm:p-6">
            <StepTitle n={3}>Comentario</StepTitle>
            <textarea
              name="notes"
              rows={3}
              placeholder="Indicaciones para la entrega, horario de contacto, etc. (opcional)"
              className="input mt-4"
            />
          </section>
        </div>

        {/* RESUMEN */}
        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl card-surface p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-carbon">Tu pedido</h2>

            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((i) => (
                <li key={i.listingId} className="flex gap-3">
                  <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-ink-700 bg-ink-950">
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

            <div className="mt-4">
              <label className="field-label">Cupón de descuento</label>
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Código (opcional)"
                className="input uppercase"
              />
              {couponError && <p className="mt-1 text-[11px] text-rose-700">{couponError}</p>}
              {!couponError && couponCode.trim() && couponDiscount > 0 && (
                <p className="mt-1 text-[11px] text-emerald-700">
                  Cupón aplicado: -{clp(couponDiscount)}
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-2 border-t border-ink-800 pt-4 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-ink-400">Subtotal</dt>
                <dd className="text-ink-200">{clp(subtotal)}</dd>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-emerald-700">Cupón {couponCode.trim().toUpperCase()}</dt>
                  <dd className="text-emerald-700">-{clp(couponDiscount)}</dd>
                </div>
              )}
              {paymentDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-emerald-700">
                    Descuento {effectivePayMethod === "CASH" ? "efectivo" : "transferencia"}
                  </dt>
                  <dd className="text-emerald-700">-{clp(paymentDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-400">{method === "PICKUP" ? "Retiro" : "Despacho"}</dt>
                <dd className={method === "PICKUP" ? "text-emerald-700" : "text-ink-400"}>
                  {method === "PICKUP" ? "Gratis" : "Por pagar"}
                </dd>
              </div>
              <div className="flex items-end justify-between border-t border-ink-800 pt-3">
                <dt className="font-semibold text-ink-200">Total</dt>
                <dd className="font-display text-2xl font-bold text-accent-400">{clp(total)}</dd>
              </div>
            </dl>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
                {error}
              </p>
            )}

            <button disabled={loading} className="btn btn-primary btn-lg mt-5 w-full">
              {loading ? "Reservando tus cartas…" : `Confirmar y reservar · ${clp(total)}`}
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
              Al confirmar aceptas los{" "}
              <Link href="/terminos-y-condiciones" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
                Términos
              </Link>
              . La compra es entre tú y el vendedor: Win Condition no maneja el pago ni realiza devoluciones (
              <Link href="/devoluciones" target="_blank" className="font-semibold text-brand-600 hover:text-brand-700">
                ver cómo resolver un problema
              </Link>
              ).
            </p>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-ink-400">
              {effectivePayMethod === "CASH"
                ? "Pagas al retirar en persona. El vendedor confirma la orden al recibir el efectivo."
                : "Después de confirmar verás los datos de la cuenta, tu código de referencia y podrás subir el comprobante."}
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
      <span className="field-label">
        {label}
        {required && <span className="text-brand-600"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="input"
      />
    </label>
  );
}
