"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Truck, XCircle } from "lucide-react";

export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: "PAID" | "SHIPPED" | "CANCELLED") {
    if (next === "CANCELLED" && !confirm("¿Cancelar este pedido? Esto no se puede deshacer.")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
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
          className="flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-50"
        >
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
          Aceptar pedido (confirmar pago)
        </button>
      )}
      {status === "PAID" && (
        <button
          type="button"
          disabled={loading}
          onClick={() => setStatus("SHIPPED")}
          className="flex items-center gap-1.5 rounded-lg border border-sky-600/40 bg-sky-500/10 px-3 py-1.5 text-[11px] font-bold text-sky-700 transition hover:bg-sky-500/20 disabled:opacity-50"
        >
          <Truck className="h-3.5 w-3.5" strokeWidth={2} />
          Marcar como enviado
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => setStatus("CANCELLED")}
        className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-[11px] font-semibold text-ink-400 transition hover:border-rose-500/40 hover:text-rose-600 disabled:opacity-50"
      >
        <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
        Cancelar
      </button>
      {error && <p className="w-full text-[11px] text-rose-700">{error}</p>}
    </div>
  );
}
