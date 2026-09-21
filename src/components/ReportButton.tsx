"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, Flag, Loader2, X } from "lucide-react";

const REASONS = [
  { value: "FALSIFICADO", label: "Parece falsificado o réplica" },
  { value: "ENGANOSO", label: "Descripción o fotos engañosas" },
  { value: "PRECIO", label: "Precio abusivo o sospechoso" },
  { value: "FRAUDE", label: "Posible estafa o fraude" },
  { value: "INAPROPIADO", label: "Contenido inapropiado" },
  { value: "OTRO", label: "Otro motivo" },
];

/** Botón discreto "Reportar" con un formulario corto. Lo revisa el administrador. */
export function ReportButton({ targetType, targetId }: { targetType: "LISTING" | "USER"; targetId: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("ENGANOSO");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, detail: detail || null }),
      });
      const data = await res.json();
      if (res.status === 401) return setNeedsLogin(true);
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el reporte");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-400 transition hover:text-rose-600"
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={2} />
        Reportar
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-carbon/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Reportar">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-carbon">
                  Reportar {targetType === "LISTING" ? "esta publicación" : "a este vendedor"}
                </h2>
                <p className="mt-1 text-[13px] text-ink-400">Revisamos cada reporte. No se lo mostramos al reportado.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-lg p-1 text-ink-400 hover:bg-ink-850 hover:text-carbon">
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            {done ? (
              <div className="mt-5 flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={1.75} />
                <p className="mt-3 font-display text-base font-bold text-carbon">¡Gracias por avisarnos!</p>
                <p className="mt-1 text-[13px] text-ink-400">Lo vamos a revisar pronto.</p>
                <button onClick={() => setOpen(false)} className="btn btn-primary btn-sm mt-4">Cerrar</button>
              </div>
            ) : needsLogin ? (
              <div className="mt-5 text-center">
                <p className="text-[14px] text-ink-300">Para reportar necesitas iniciar sesión.</p>
                <Link href={`/ingresar?next=${encodeURIComponent(pathname)}`} className="btn btn-primary btn-sm mt-4">
                  Iniciar sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block">
                  <span className="field-label">Motivo</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Detalle (opcional)</span>
                  <textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} rows={3} className="input resize-y" placeholder="Cuéntanos qué viste." />
                </label>
                {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[12px] font-medium text-rose-700">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">Cancelar</button>
                  <button disabled={busy} className="btn btn-primary btn-sm">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />} Enviar reporte
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
