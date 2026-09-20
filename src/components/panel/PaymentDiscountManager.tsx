"use client";

import { useState } from "react";
import { Banknote, Landmark, Plus, Trash2 } from "lucide-react";

export interface PaymentDiscountValue {
  id: string;
  method: "TRANSFER" | "CASH";
  percent: number;
  label: string | null;
  active: boolean;
}

const METHODS: Array<{
  value: "TRANSFER" | "CASH";
  title: string;
  hint: string;
  icon: typeof Landmark;
}> = [
  {
    value: "TRANSFER",
    title: "Pago por transferencia",
    hint: "Se descuenta automáticamente cuando el comprador elige transferir.",
    icon: Landmark,
  },
  {
    value: "CASH",
    title: "Efectivo al retirar",
    hint: "Solo aplica con retiro en persona y pago en efectivo.",
    icon: Banknote,
  },
];

const QUICK = [2, 5, 10];

/**
 * Descuentos por método de pago, creados por el administrador igual que los
 * cupones: se crean varios (2%, 5%, 10%…) y se elige cuál queda aplicándose.
 * Solo uno puede estar activo por método; sin ninguno activo no hay descuento.
 */
export function PaymentDiscountManager({ initial }: { initial: PaymentDiscountValue[] }) {
  const [discounts, setDiscounts] = useState(initial);
  const [method, setMethod] = useState<"TRANSFER" | "CASH">("TRANSFER");
  const [percent, setPercent] = useState(5);
  const [label, setLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(url: string, init: RequestInit): Promise<PaymentDiscountValue[]> {
    const res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo completar la acción");
    return data.discounts as PaymentDiscountValue[];
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      setDiscounts(
        await call("/api/admin/payment-discounts", {
          method: "POST",
          body: JSON.stringify({
            method,
            percent,
            label: label.trim() || null,
            active: true,
          }),
        })
      );
      setLabel("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggle(d: PaymentDiscountValue) {
    setError(null);
    setBusyId(d.id);
    try {
      setDiscounts(
        await call(`/api/admin/payment-discounts/${d.id}`, {
          method: "PATCH",
          body: JSON.stringify({ active: !d.active }),
        })
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(d: PaymentDiscountValue) {
    if (!confirm(`¿Eliminar el descuento de ${d.percent}%?`)) return;
    setError(null);
    setBusyId(d.id);
    try {
      setDiscounts(await call(`/api/admin/payment-discounts/${d.id}`, { method: "DELETE" }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Crear */}
      <form onSubmit={create} className="rounded-2xl card-surface p-5 sm:p-6">
        <h2 className="text-[15px] font-bold text-carbon">Crear un descuento</h2>
        <p className="mt-0.5 text-[12px] text-ink-400">
          Créalo y queda aplicándose de inmediato. Si ya había otro activo para ese método, se
          desactiva. Puedes tener varios guardados (2%, 5%, 10%…) y cambiar cuál usar cuando quieras.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <span className="field-label">Método de pago</span>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.value}
                    type="button"
                    data-active={method === m.value}
                    onClick={() => setMethod(m.value)}
                    className="pill !justify-center !rounded-xl !py-2.5"
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                    {m.value === "TRANSFER" ? "Transferencia" : "Efectivo"}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="field-label">Porcentaje</span>
            <div className="relative w-full sm:w-28">
              <input
                type="number"
                min={1}
                max={30}
                value={percent}
                onChange={(e) => setPercent(Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 1))))}
                className="input pr-7 text-right font-bold"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
                %
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold text-ink-400">Atajos:</span>
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              data-active={percent === q}
              onClick={() => setPercent(q)}
              className="pill !px-3 !py-1"
            >
              {q}%
            </button>
          ))}
        </div>

        <div className="mt-4">
          <span className="field-label">Nombre (opcional)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Ej: Promo de septiembre"
            className="input"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
            {error}
          </p>
        )}

        <button disabled={creating} className="btn btn-primary mt-5">
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          {creating ? "Creando…" : "Crear y aplicar"}
        </button>
      </form>

      {/* Listas por método */}
      {METHODS.map((m) => {
        const Icon = m.icon;
        const list = discounts.filter((d) => d.method === m.value);
        const active = list.find((d) => d.active);
        return (
          <section key={m.value} className="rounded-2xl card-surface p-5 sm:p-6">
            <div className="flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-carbon text-white">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[15px] font-bold text-carbon">{m.title}</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      active
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-ink-850 text-ink-400"
                    }`}
                  >
                    {active ? `Aplicando ${active.percent}%` : "Sin descuento"}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-400">{m.hint}</p>
              </div>
            </div>

            <ul className="mt-4 divide-y divide-ink-800">
              {list.length === 0 && (
                <li className="py-3 text-[12px] text-ink-400">
                  Todavía no hay descuentos para este método. Los compradores pagan el precio normal.
                </li>
              )}
              {list.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-bold text-carbon">{d.percent}%</p>
                    {d.label && <p className="truncate text-[12px] text-ink-400">{d.label}</p>}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => toggle(d)}
                    className={`rounded-xl border px-3.5 py-1.5 text-[12px] font-bold transition disabled:opacity-60 ${
                      d.active
                        ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-700"
                        : "border-ink-700 text-ink-400 hover:border-brand-500 hover:text-brand-600"
                    }`}
                  >
                    {d.active ? "Activo" : "Activar"}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => remove(d)}
                    aria-label={`Eliminar descuento de ${d.percent}%`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-700 text-ink-400 transition hover:border-rose-500/50 hover:text-rose-600 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
