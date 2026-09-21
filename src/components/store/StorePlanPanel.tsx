"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Clock, Copy, FileCheck2, Upload, XCircle } from "lucide-react";
import { clp } from "@/lib/format";

export interface PlanOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  maxFeatured: number;
  advancedStats: boolean;
  showcase: boolean;
}

export interface SubscriptionRow {
  id: string;
  planName: string;
  months: number;
  amount: number;
  status: string;
  reference: string;
  receiptUploadedAt: string | null;
  note: string | null;
  createdAt: string;
  periodEnd: string | null;
}

export interface MembershipBank {
  bankName: string | null;
  accountType: string | null;
  accountNumber: string;
  holderName: string | null;
  rut: string | null;
}

const MONTHS = [1, 3, 6, 12];

function CopyChip({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* se puede seleccionar a mano */
        }
      }}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-800 bg-white px-3.5 py-2.5 text-left transition hover:border-brand-500"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ink-400">{label}</span>
        <span className="block truncate text-[13px] font-semibold text-carbon">{value}</span>
      </span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-ink-400" strokeWidth={2} />
      )}
    </button>
  );
}

function fmtDate(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Santiago" })
    : "—";
}

/** Estado de la membresía, compra de un plan, comprobante de pago e historial. */
export function StorePlanPanel({
  active,
  planName,
  activeUntil,
  suspended,
  plans,
  pending,
  history,
  bank,
}: {
  active: boolean;
  planName: string | null;
  activeUntil: string | null;
  suspended: boolean;
  plans: PlanOption[];
  pending: SubscriptionRow | null;
  history: SubscriptionRow[];
  bank: MembershipBank | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [months, setMonths] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = plans.find((p) => p.code === planCode);

  async function request(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la acción");
      router.refresh();
      return data;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const subscribe = () =>
    request("/api/store/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, months }),
    });

  const uploadReceipt = (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return request(`/api/store/subscriptions/${pending!.id}/receipt`, { method: "POST", body });
  };

  const cancel = () => {
    if (!confirm("¿Cancelar esta solicitud?")) return;
    return request(`/api/store/subscriptions/${pending!.id}`, { method: "DELETE" });
  };

  return (
    <div className="space-y-5">
      {/* Estado */}
      <div
        className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${
          active ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-ink-800 bg-ink-900"
        }`}
      >
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            active ? "bg-emerald-500 text-white" : "bg-ink-800 text-ink-400"
          }`}
        >
          <BadgeCheck className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          {active ? (
            <>
              <p className="text-[15px] font-bold text-carbon">Tu tienda está activa · {planName}</p>
              <p className="text-[12px] text-ink-400">Vigente hasta el {fmtDate(activeUntil)}</p>
            </>
          ) : suspended ? (
            <>
              <p className="text-[15px] font-bold text-carbon">Tu tienda está suspendida</p>
              <p className="text-[12px] text-ink-400">Escríbenos para revisar tu caso.</p>
            </>
          ) : activeUntil ? (
            <>
              <p className="text-[15px] font-bold text-carbon">Tu plan venció el {fmtDate(activeUntil)}</p>
              <p className="text-[12px] text-ink-400">Renueva para volver a publicar tu tienda.</p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-bold text-carbon">Todavía no tienes tienda premium</p>
              <p className="text-[12px] text-ink-400">
                Elige un plan abajo. Mientras tanto puedes preparar tu diseño en el editor.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Solicitud pendiente */}
      {pending ? (
        <div className="rounded-2xl card-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-800">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              Pago pendiente de revisión
            </span>
            <span className="text-[13px] font-semibold text-carbon">
              {pending.planName} · {pending.months} {pending.months === 1 ? "mes" : "meses"}
            </span>
          </div>

          {bank ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <CopyChip label="Monto exacto" value={String(pending.amount)} />
              <CopyChip label="Referencia (ponla en el comentario)" value={pending.reference} />
              {bank.bankName && <CopyChip label="Banco" value={bank.bankName} />}
              {bank.accountType && <CopyChip label="Tipo de cuenta" value={bank.accountType} />}
              <CopyChip label="N° de cuenta" value={bank.accountNumber} />
              {bank.rut && <CopyChip label="RUT" value={bank.rut} />}
              {bank.holderName && <CopyChip label="Titular" value={bank.holderName} />}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-500/10 p-3 text-[12px] text-amber-900">
              Aún no hay cuenta de destino configurada. Escríbenos y te la enviamos. Tu solicitud ya quedó
              registrada con la referencia <strong>{pending.reference}</strong>.
            </p>
          )}
          <p className="mt-2 text-[12px] text-ink-400">
            Monto a transferir: <strong className="text-carbon">{clp(pending.amount)}</strong>. Cuando lo
            revisemos tu tienda se activa sola.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadReceipt(f);
                e.target.value = "";
              }}
            />
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="btn btn-primary btn-sm">
              {pending.receiptUploadedAt ? (
                <FileCheck2 className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Upload className="h-4 w-4" strokeWidth={2} />
              )}
              {pending.receiptUploadedAt ? "Reemplazar comprobante" : "Subir comprobante"}
            </button>
            {pending.receiptUploadedAt && (
              <a
                href={`/api/store/subscriptions/${pending.id}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-brand-600 hover:text-brand-700"
              >
                Ver comprobante enviado
              </a>
            )}
            <button type="button" disabled={busy} onClick={cancel} className="ml-auto text-[12px] font-semibold text-ink-400 hover:text-rose-700">
              Cancelar solicitud
            </button>
          </div>
        </div>
      ) : (
        /* Elegir plan */
        <div className="rounded-2xl card-surface p-5">
          <h3 className="text-sm font-semibold text-carbon">{active ? "Renovar o cambiar de plan" : "Elige tu plan"}</h3>
          <p className="mt-0.5 text-[12px] text-ink-400">
            Los meses nuevos se suman a los que ya tienes. Pagas por transferencia y nosotros activamos tu tienda.
          </p>

          {plans.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-400">Por ahora no hay planes disponibles.</p>
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanCode(p.code)}
                    aria-pressed={planCode === p.code}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      planCode === p.code
                        ? "border-brand-500 bg-brand-500/[0.04] shadow-[0_12px_30px_-18px_var(--color-brand-600)]"
                        : "border-ink-800 hover:border-ink-600"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-lg font-bold text-carbon">{p.name}</span>
                      <span className="text-[13px] font-bold text-brand-600">{clp(p.priceMonthly)}/mes</span>
                    </span>
                    {p.description && <span className="mt-1 block text-[12px] text-ink-400">{p.description}</span>}
                    <ul className="mt-3 space-y-1 text-[12px] text-ink-300">
                      <li>Banner, logo, colores, redes y anuncio</li>
                      <li>Link corto y QR con tu logo</li>
                      <li>Hasta {p.maxFeatured} productos destacados</li>
                      <li>{p.advancedStats ? "Estadísticas completas" : "Estadísticas básicas"}</li>
                      {p.showcase && <li>Vitrina de tiendas destacadas</li>}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-ink-400">Duración</span>
                {MONTHS.map((m) => (
                  <button key={m} type="button" data-active={months === m} onClick={() => setMonths(m)} className="pill">
                    {m} {m === 1 ? "mes" : "meses"}
                  </button>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="button" disabled={busy || !chosen} onClick={subscribe} className="btn btn-primary">
                  {busy ? "Creando…" : "Continuar al pago"}
                </button>
                {chosen && (
                  <p className="text-[13px] text-ink-300">
                    Total: <strong className="font-display text-lg text-carbon">{clp(chosen.priceMonthly * months)}</strong>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">{error}</p>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="rounded-2xl card-surface p-5">
          <h3 className="text-sm font-semibold text-carbon">Historial de pagos</h3>
          <ul className="mt-3 divide-y divide-ink-800 text-[13px]">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <span className="text-ink-400">{fmtDate(h.createdAt)}</span>
                <span className="flex-1 font-medium text-ink-200">
                  {h.planName} · {h.months} {h.months === 1 ? "mes" : "meses"}
                </span>
                <span className="font-bold text-carbon">{h.amount > 0 ? clp(h.amount) : "Cortesía"}</span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    h.status === "APPROVED"
                      ? "bg-emerald-500/15 text-emerald-700"
                      : h.status === "REJECTED"
                        ? "bg-rose-500/15 text-rose-700"
                        : "bg-amber-500/15 text-amber-800"
                  }`}
                >
                  {h.status === "REJECTED" && <XCircle className="h-3 w-3" strokeWidth={2} />}
                  {h.status === "APPROVED" ? "Aprobado" : h.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                </span>
                {h.status === "REJECTED" && h.note && (
                  <span className="basis-full text-[12px] text-ink-400">Motivo: {h.note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
