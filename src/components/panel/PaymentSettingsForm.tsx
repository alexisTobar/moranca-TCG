"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Banknote, Timer, Check } from "lucide-react";

export interface PaymentSettingsValues {
  transferDiscountEnabled: boolean;
  transferDiscountPct: number;
  cashDiscountEnabled: boolean;
  cashDiscountPct: number;
  paymentWindowHours: number;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-emerald-500" : "bg-ink-600"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function PercentField({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className={`mt-4 transition ${disabled ? "pointer-events-none opacity-40" : ""}`}>
      <label className="field-label">Porcentaje de descuento (0 a 30)</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer accent-[var(--color-brand-600)]"
        />
        <div className="relative w-24">
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(Math.max(0, Math.min(30, Math.round(Number(e.target.value) || 0))))}
            className="input pr-7 text-right font-bold"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-400">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

export function PaymentSettingsForm({ initial }: { initial: PaymentSettingsValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<PaymentSettingsValues>) {
    setValues((v) => ({ ...v, ...next }));
    setSaved(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const example = 10000;
  const transferPct = values.transferDiscountEnabled ? values.transferDiscountPct : 0;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* TRANSFERENCIA */}
      <section className="rounded-2xl card-surface p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-carbon text-white">
            <Landmark className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-carbon">Descuento por transferencia</h2>
                <p className="mt-0.5 text-[12px] text-ink-400">
                  Se aplica automáticamente cuando el comprador elige pagar por transferencia.
                </p>
              </div>
              <Toggle
                checked={values.transferDiscountEnabled}
                onChange={(v) => patch({ transferDiscountEnabled: v })}
                label="Activar descuento por transferencia"
              />
            </div>
            <PercentField
              value={values.transferDiscountPct}
              disabled={!values.transferDiscountEnabled}
              onChange={(v) => patch({ transferDiscountPct: v })}
            />
            <p className="mt-3 rounded-lg bg-ink-900 px-3 py-2 text-[12px] text-ink-300">
              {transferPct > 0 ? (
                <>
                  Ejemplo: una compra de <strong>$10.000</strong> por transferencia se paga{" "}
                  <strong className="text-emerald-700">
                    ${(example - Math.round((example * transferPct) / 100)).toLocaleString("es-CL")}
                  </strong>
                  .
                </>
              ) : (
                "Sin descuento: la transferencia se cobra al precio normal."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* EFECTIVO */}
      <section className="rounded-2xl card-surface p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-carbon text-white">
            <Banknote className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-bold text-carbon">Descuento por efectivo al retirar</h2>
                <p className="mt-0.5 text-[12px] text-ink-400">
                  Solo aplica cuando el comprador retira en persona y paga en efectivo.
                </p>
              </div>
              <Toggle
                checked={values.cashDiscountEnabled}
                onChange={(v) => patch({ cashDiscountEnabled: v })}
                label="Activar descuento por efectivo"
              />
            </div>
            <PercentField
              value={values.cashDiscountPct}
              disabled={!values.cashDiscountEnabled}
              onChange={(v) => patch({ cashDiscountPct: v })}
            />
          </div>
        </div>
      </section>

      {/* PLAZO */}
      <section className="rounded-2xl card-surface p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-carbon text-white">
            <Timer className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-carbon">Plazo para pagar</h2>
            <p className="mt-0.5 text-[12px] text-ink-400">
              Al comprar, las cartas quedan reservadas. Si el comprador no paga dentro de este
              plazo, la orden se cancela sola y las cartas vuelven a la tienda.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={168}
                value={values.paymentWindowHours}
                onChange={(e) =>
                  patch({
                    paymentWindowHours: Math.max(1, Math.min(168, Math.round(Number(e.target.value) || 1))),
                  })
                }
                className="input w-28 text-right font-bold"
              />
              <span className="text-[13px] font-semibold text-ink-300">horas</span>
              <div className="ml-auto flex flex-wrap gap-1.5">
                {[24, 48, 72].map((h) => (
                  <button
                    key={h}
                    type="button"
                    data-active={values.paymentWindowHours === h}
                    onClick={() => patch({ paymentWindowHours: h })}
                    className="pill"
                  >
                    {h} h
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[13px] text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button disabled={saving} className="btn btn-primary">
          {saving ? "Guardando…" : "Guardar configuración"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Guardado
          </span>
        )}
      </div>
    </form>
  );
}
