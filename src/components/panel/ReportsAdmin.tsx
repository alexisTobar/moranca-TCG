"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Flag, Loader2, XCircle } from "lucide-react";
import { usePanelCounts } from "@/components/panel/PanelCounts";

export interface AdminReport {
  id: string;
  targetType: "LISTING" | "USER";
  targetLabel: string;
  targetHref: string | null;
  targetStatus: string | null;
  reporter: string;
  reason: string;
  detail: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
}

const REASON_LABEL: Record<string, string> = {
  FALSIFICADO: "Falsificado o réplica",
  ENGANOSO: "Engañoso",
  PRECIO: "Precio sospechoso",
  FRAUDE: "Posible fraude",
  INAPROPIADO: "Inapropiado",
  OTRO: "Otro",
};

/** Bandeja de reportes: resolver (con o sin medida sobre la publicación o la cuenta) o descartar. */
export function ReportsAdmin({ reports }: { reports: AdminReport[] }) {
  const router = useRouter();
  const { refresh } = usePanelCounts();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [measure, setMeasure] = useState<Record<string, boolean>>({});

  async function act(r: AdminReport, action: "resolve" | "dismiss") {
    setBusy(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/reports/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: note[r.id] || null,
          ...(action === "resolve" && measure[r.id] ? (r.targetType === "LISTING" ? { pauseListing: true } : { suspendUser: true }) : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar");
      router.refresh();
      refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const open = reports.filter((r) => r.status === "OPEN");
  const closed = reports.filter((r) => r.status !== "OPEN");

  return (
    <div className="space-y-6">
      {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[13px] font-medium text-rose-700">{error}</p>}

      {open.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />
          <p className="mt-3 font-display text-lg font-bold text-carbon">Sin reportes pendientes</p>
          <p className="mt-1 text-[13px] text-ink-400">Cuando alguien reporte una publicación o un vendedor, aparecerá aquí.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {open.map((r) => (
            <li key={r.id} className="rounded-2xl card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-rose-600">
                    <Flag className="h-3.5 w-3.5" strokeWidth={2} /> {REASON_LABEL[r.reason] ?? r.reason}
                    <span className="rounded-full bg-ink-850 px-2 py-0.5 text-[10px] text-ink-400">{r.targetType === "LISTING" ? "Publicación" : "Usuario"}</span>
                  </p>
                  <p className="mt-1 text-[15px] font-bold text-carbon">
                    {r.targetHref ? (
                      <Link href={r.targetHref} target="_blank" className="inline-flex items-center gap-1 hover:text-brand-600">
                        {r.targetLabel} <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                      </Link>
                    ) : (
                      r.targetLabel
                    )}
                    {r.targetStatus && <span className="ml-2 text-[11px] font-medium text-ink-400">({r.targetStatus})</span>}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    Reportó {r.reporter} · {new Date(r.createdAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
              {r.detail && <p className="mt-3 rounded-xl bg-ink-900 p-3 text-[13px] leading-relaxed text-ink-300">{r.detail}</p>}

              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-800 pt-4">
                <label className="min-w-[14rem] flex-1">
                  <span className="mb-1 block text-[11px] font-semibold text-ink-400">Nota interna (opcional)</span>
                  <input value={note[r.id] ?? ""} onChange={(e) => setNote((p) => ({ ...p, [r.id]: e.target.value }))} maxLength={500} className="input !py-2 text-[13px]" />
                </label>
                <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-300">
                  <input type="checkbox" checked={measure[r.id] ?? false} onChange={(e) => setMeasure((p) => ({ ...p, [r.id]: e.target.checked }))} className="h-4 w-4 accent-[var(--color-brand-600)]" />
                  {r.targetType === "LISTING" ? "Pausar la publicación" : "Suspender la cuenta"}
                </label>
                <button disabled={busy === r.id} onClick={() => act(r, "resolve")} className="btn btn-primary btn-sm">
                  {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={2} />} Resolver
                </button>
                <button disabled={busy === r.id} onClick={() => act(r, "dismiss")} className="btn btn-secondary btn-sm">
                  <XCircle className="h-4 w-4" strokeWidth={2} /> Descartar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <details className="rounded-2xl card-surface">
          <summary className="cursor-pointer list-none px-5 py-3.5 text-[13px] font-bold text-carbon">Historial ({closed.length})</summary>
          <ul className="divide-y divide-ink-800 border-t border-ink-800">
            {closed.map((r) => (
              <li key={r.id} className="px-5 py-3 text-[13px]">
                <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "RESOLVED" ? "bg-emerald-500/15 text-emerald-700" : "bg-ink-850 text-ink-400"}`}>
                  {r.status === "RESOLVED" ? "Resuelto" : "Descartado"}
                </span>
                <span className="font-semibold text-carbon">{r.targetLabel}</span>
                <span className="text-ink-400"> · {REASON_LABEL[r.reason] ?? r.reason} · {r.reporter}</span>
                {r.resolution && <span className="block text-[12px] text-ink-400">Nota: {r.resolution}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
