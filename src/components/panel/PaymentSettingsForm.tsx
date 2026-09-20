"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Timer, Check } from "lucide-react";

/** Plazo que tiene el comprador para pagar antes de que la orden se cancele sola. */
export function PaymentSettingsForm({ initialHours }: { initialHours: number }) {
  const router = useRouter();
  const [hours, setHours] = useState(initialHours);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentWindowHours: hours }),
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
    <form onSubmit={onSubmit} className="rounded-2xl card-surface p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-carbon text-white">
          <Timer className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-carbon">Plazo para pagar</h2>
          <p className="mt-0.5 text-[12px] text-ink-400">
            Al comprar, las cartas quedan reservadas. Si el comprador no paga dentro de este plazo,
            la orden se cancela sola y las cartas vuelven a la tienda.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={1}
              max={168}
              value={hours}
              onChange={(e) => {
                setHours(Math.max(1, Math.min(168, Math.round(Number(e.target.value) || 1))));
                setSaved(false);
              }}
              className="input w-28 text-right font-bold"
            />
            <span className="text-[13px] font-semibold text-ink-300">horas</span>
            <div className="flex flex-wrap gap-1.5 sm:ml-auto">
              {[24, 48, 72].map((h) => (
                <button
                  key={h}
                  type="button"
                  data-active={hours === h}
                  onClick={() => {
                    setHours(h);
                    setSaved(false);
                  }}
                  className="pill"
                >
                  {h} h
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button disabled={saving} className="btn btn-primary btn-sm">
              {saving ? "Guardando…" : "Guardar plazo"}
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
                <Check className="h-4 w-4" strokeWidth={2.5} />
                Guardado
              </span>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
