"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Truck, XCircle } from "lucide-react";

export function OrderStatusActions({
  orderId,
  status,
  reference,
  total,
  shipMethod,
}: {
  orderId: string;
  status: string;
  reference?: string | null;
  total?: number;
  shipMethod?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipping, setShipping] = useState(false);
  const [courier, setCourier] = useState("");
  const [code, setCode] = useState("");

  async function setStatus(next: "PAID" | "SHIPPED" | "CANCELLED") {
    if (next === "CANCELLED" && !confirm("¿Cancelar este pedido? Esto no se puede deshacer.")) {
      return;
    }
    if (
      next === "PAID" &&
      !confirm(
        `Confirma solo si el dinero ya está en tu cuenta bancaria${
          total ? ` (${total.toLocaleString("es-CL")} CLP)` : ""
        }${reference ? ` con la referencia ${reference}` : ""}. ¿Confirmar el pago?`
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          next === "SHIPPED" ? { status: next, trackingCourier: courier || null, trackingCode: code || null } : { status: next }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar la orden");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (status !== "PENDING" && status !== "PAID") return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "PENDING" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus("PAID")}
          className="flex items-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-500/10 px-3.5 py-2 text-[12px] font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          Confirmar pago recibido
        </button>
      )}
      {status === "PAID" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => (shipMethod === "PICKUP" ? setStatus("SHIPPED") : setShipping((v) => !v))}
          className="flex items-center gap-1.5 rounded-xl border border-sky-600/40 bg-sky-500/10 px-3.5 py-2 text-[12px] font-bold text-sky-700 transition hover:bg-sky-500/20 disabled:opacity-50"
        >
          <Truck className="h-3.5 w-3.5" strokeWidth={2} />
          Marcar como enviado
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => setStatus("CANCELLED")}
        className="flex items-center gap-1.5 rounded-xl border border-ink-700 px-3.5 py-2 text-[12px] font-semibold text-ink-400 transition hover:border-rose-500/40 hover:text-rose-600 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
        Cancelar
      </button>
      {shipping && status === "PAID" && (
        <div className="flex w-full flex-wrap items-end gap-2 rounded-xl border border-sky-600/30 bg-sky-500/5 p-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-400">Courier</span>
            <select value={courier} onChange={(e) => setCourier(e.target.value)} className="input !w-auto !py-2 text-[12px]">
              <option value="">Selecciona…</option>
              {["Starken", "Blue Express", "Chilexpress", "Correos de Chile", "Otro"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-ink-400">N° de seguimiento (opcional)</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={60} placeholder="Ej: 1234567890" className="input !w-48 !py-2 text-[12px]" />
          </label>
          <button type="button" disabled={loading} onClick={() => setStatus("SHIPPED")} className="rounded-xl bg-sky-600 px-4 py-2 text-[12px] font-bold text-white transition hover:bg-sky-500 disabled:opacity-50">
            Confirmar envío
          </button>
        </div>
      )}
      {error && <p className="w-full text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}
