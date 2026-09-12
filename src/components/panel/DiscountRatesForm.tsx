"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DiscountRatesValues {
  transferDiscountPct: number;
  cashDiscountPct: number;
}

export function DiscountRatesForm({ initial }: { initial: DiscountRatesValues }) {
  const router = useRouter();
  const [transferPct, setTransferPct] = useState(initial.transferDiscountPct);
  const [cashPct, setCashPct] = useState(initial.cashDiscountPct);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferDiscountPct: transferPct,
          cashDiscountPct: cashPct,
        }),
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

  return (
    <form onSubmit={onSubmit} className="rounded-2xl card-surface p-5">
      <h3 className="text-sm font-semibold text-carbon">Descuento por método de pago</h3>
      <p className="mt-0.5 text-[12px] text-ink-400">
        Se aplica sobre el subtotal de tus ventas, por sobre cualquier cupón que use el
        comprador. Mercado Pago nunca tiene descuento (cobra comisión aparte).
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Transferencia bancaria (0-30%)
          </span>
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={transferPct}
            onChange={(e) => setTransferPct(Math.max(0, Math.min(30, Number(e.target.value))))}
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
            Efectivo al retirar (0-30%)
          </span>
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={cashPct}
            onChange={(e) => setCashPct(Math.max(0, Math.min(30, Number(e.target.value))))}
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-[12px] text-brand-600">{error}</p>}
      {saved && <p className="mt-3 text-[12px] text-emerald-700">Guardado.</p>}
      <button
        disabled={saving}
        className="mt-4 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
