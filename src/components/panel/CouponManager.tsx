"use client";

import { useState } from "react";
import { clp } from "@/lib/format";

export interface CouponValue {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
}

export function CouponManager({ initial }: { initial: CouponValue[] }) {
  const [coupons, setCoupons] = useState<CouponValue[]>(initial);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState(10);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Ponle un código al cupón.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/seller/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, type, value, active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el cupón");
      setCoupons((prev) => [data.coupon as CouponValue, ...prev]);
      setCode("");
      setValue(10);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: CouponValue) {
    setTogglingId(coupon.id);
    try {
      const res = await fetch(`/api/seller/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? (data.coupon as CouponValue) : c))
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="rounded-2xl card-surface p-5">
      <h3 className="text-sm font-semibold text-carbon">Cupones de tu tienda</h3>
      <p className="mt-0.5 text-[12px] text-ink-400">
        El comprador lo escribe en el checkout. Se aplica sobre el subtotal de tus
        productos en esa compra.
      </p>

      <form onSubmit={createCoupon} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODIGO"
          maxLength={30}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm uppercase text-ink-200 outline-none focus:border-carbon"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
        >
          <option value="PERCENT">%</option>
          <option value="FIXED">CLP fijo</option>
        </select>
        <input
          type="number"
          min={1}
          max={type === "PERCENT" ? 100 : undefined}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-28 rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
        />
        <button
          disabled={creating}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
        >
          {creating ? "Creando…" : "Crear cupón"}
        </button>
      </form>

      {error && <p className="mt-3 text-[12px] text-brand-600">{error}</p>}

      <ul className="mt-5 divide-y divide-ink-800">
        {coupons.length === 0 && (
          <li className="py-3 text-[12px] text-ink-400">Todavía no tienes cupones.</li>
        )}
        {coupons.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-[13px] font-bold text-ink-200">{c.code}</p>
              <p className="text-[11px] text-ink-400">
                {c.type === "PERCENT" ? `${c.value}%` : clp(c.value)} de descuento
              </p>
            </div>
            <button
              type="button"
              disabled={togglingId === c.id}
              onClick={() => toggleActive(c)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-60 ${
                c.active
                  ? "border-emerald-600/40 bg-emerald-500/10 text-emerald-700"
                  : "border-ink-700 text-ink-400"
              }`}
            >
              {c.active ? "Activo" : "Inactivo"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
