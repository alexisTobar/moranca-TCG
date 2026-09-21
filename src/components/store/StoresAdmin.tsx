"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ExternalLink, FileCheck2, Gift, Pause, Play, Star, XCircle } from "lucide-react";
import { clp } from "@/lib/format";

export interface AdminPending {
  id: string;
  sellerName: string;
  email: string;
  planName: string;
  months: number;
  amount: number;
  reference: string;
  hasReceipt: boolean;
  createdAt: string;
}

export interface AdminStore {
  id: string;
  sellerName: string;
  email: string;
  slug: string;
  planCode: string | null;
  planName: string | null;
  planShowcase: boolean;
  activeUntil: string | null;
  status: string;
  active: boolean;
  featured: boolean;
  views30: number;
  listings: number;
}

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  maxFeatured: number;
  advancedStats: boolean;
  showcase: boolean;
  active: boolean;
}

type Tab = "pending" | "stores" | "plans";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Santiago" }) : "—";

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "bg-emerald-500" : "bg-ink-600"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function PlanForm({ plan, onSaved, onError }: { plan: AdminPlan; onSaved: () => void; onError: (m: string) => void }) {
  const [p, setP] = useState(plan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/store-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          description: p.description,
          priceMonthly: p.priceMonthly,
          maxFeatured: p.maxFeatured,
          advancedStats: p.advancedStats,
          showcase: p.showcase,
          active: p.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el plan");
      setSaved(true);
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const upd = <K extends keyof AdminPlan>(k: K, v: AdminPlan[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  return (
    <div className="rounded-2xl card-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-carbon">
          {plan.name} <span className="text-[11px] font-semibold text-ink-400">({plan.code})</span>
        </h3>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-ink-300">
          Disponible para comprar
          <Switch checked={p.active} onChange={(v) => upd("active", v)} label="Plan disponible" />
        </label>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nombre</span>
          <input value={p.name} onChange={(e) => upd("name", e.target.value)} maxLength={40} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Precio mensual (CLP)</span>
          <input type="number" min={0} value={p.priceMonthly} onChange={(e) => upd("priceMonthly", Math.max(0, Math.round(Number(e.target.value) || 0)))} className="input font-bold" />
        </label>
        <label className="block sm:col-span-2">
          <span className="field-label">Descripción</span>
          <input value={p.description} onChange={(e) => upd("description", e.target.value)} maxLength={200} className="input" />
        </label>
        <label className="block">
          <span className="field-label">Productos destacados permitidos</span>
          <input type="number" min={0} max={50} value={p.maxFeatured} onChange={(e) => upd("maxFeatured", Math.max(0, Math.min(50, Math.round(Number(e.target.value) || 0))))} className="input" />
        </label>
        <div className="flex flex-col justify-end gap-2.5 pb-1">
          <label className="flex items-center justify-between gap-3 text-[13px] font-semibold text-ink-200">
            Estadísticas completas
            <Switch checked={p.advancedStats} onChange={(v) => upd("advancedStats", v)} label="Estadísticas completas" />
          </label>
          <label className="flex items-center justify-between gap-3 text-[13px] font-semibold text-ink-200">
            Puede estar en la vitrina de destacadas
            <Switch checked={p.showcase} onChange={(v) => upd("showcase", v)} label="Vitrina" />
          </label>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" disabled={saving} onClick={save} className="btn btn-primary btn-sm">
          {saving ? "Guardando…" : "Guardar plan"}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[13px] font-semibold text-emerald-700">
            <Check className="h-4 w-4" strokeWidth={2.5} /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}

/** Centro de control de las tiendas premium (solo administrador). */
export function StoresAdmin({
  pending,
  stores,
  plans,
  monthlyIncome,
}: {
  pending: AdminPending[];
  stores: AdminStore[];
  plans: AdminPlan[];
  monthlyIncome: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(pending.length > 0 ? "pending" : "stores");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grant, setGrant] = useState<Record<string, { plan: string; months: number }>>({});
  const [open, setOpen] = useState<string | null>(null);

  const activeCount = stores.filter((s) => s.active).length;

  async function call(key: string, url: string, body: unknown) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo completar la acción");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const decide = (p: AdminPending, action: "approve" | "reject") => {
    let note: string | null = null;
    if (action === "reject") {
      note = prompt("Motivo del rechazo (el vendedor lo verá):", "No encontramos el pago");
      if (note === null) return;
    } else if (!confirm(`¿Confirmas que recibiste ${clp(p.amount)} con la referencia ${p.reference}?`)) {
      return;
    }
    return call(p.id, `/api/admin/store-subscriptions/${p.id}`, { action, note });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Tiendas activas", String(activeCount)],
          ["Pagos por revisar", String(pending.length)],
          ["Ingreso mensual", clp(monthlyIncome)],
          ["Vendedores", String(stores.length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl card-surface p-4">
            <p className="font-display text-2xl font-bold text-carbon">{v}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{k}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["pending", `Solicitudes${pending.length ? ` (${pending.length})` : ""}`],
            ["stores", "Tiendas"],
            ["plans", "Planes y precios"],
          ] as Array<[Tab, string]>
        ).map(([k, label]) => (
          <button key={k} type="button" data-active={tab === k} onClick={() => setTab(k)} className="pill">
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[13px] text-rose-700">{error}</p>
      )}

      {/* SOLICITUDES */}
      {tab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink-700 p-10 text-center text-[13px] text-ink-400">
              No hay pagos pendientes de revisión.
            </p>
          ) : (
            pending.map((p) => (
              <div key={p.id} className="rounded-2xl card-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="text-[14px] font-bold text-carbon">{p.sellerName}</p>
                    <p className="truncate text-[12px] text-ink-400">{p.email}</p>
                  </div>
                  <div className="text-[13px] text-ink-300">
                    {p.planName} · {p.months} {p.months === 1 ? "mes" : "meses"}
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-carbon">{clp(p.amount)}</p>
                    <p className="text-[11px] font-semibold text-ink-400">Ref. {p.reference}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-ink-800 pt-3">
                  {p.hasReceipt ? (
                    <a
                      href={`/api/store/subscriptions/${p.id}/receipt`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-500/20"
                    >
                      <FileCheck2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Ver comprobante
                    </a>
                  ) : (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[12px] font-semibold text-amber-800">
                      Sin comprobante todavía
                    </span>
                  )}
                  <span className="text-[11px] text-ink-400">Solicitado el {fmt(p.createdAt)}</span>
                  <div className="ml-auto flex gap-2">
                    <button type="button" disabled={busy === p.id} onClick={() => decide(p, "reject")} className="btn btn-secondary btn-sm">
                      <XCircle className="h-4 w-4" strokeWidth={2} />
                      Rechazar
                    </button>
                    <button type="button" disabled={busy === p.id} onClick={() => decide(p, "approve")} className="btn btn-primary btn-sm">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                      Confirmar pago
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TIENDAS */}
      {tab === "stores" && (
        <div className="space-y-3">
          {stores.map((s) => {
            const g = grant[s.id] ?? { plan: plans[0]?.code ?? "", months: 1 };
            const expired = !s.active && s.activeUntil && s.status !== "SUSPENDED";
            return (
              <div key={s.id} className="rounded-2xl card-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="flex items-center gap-1.5 text-[14px] font-bold text-carbon">
                      {s.sellerName}
                      {s.active && <BadgeCheck className="h-4 w-4 text-brand-600" strokeWidth={2} />}
                    </p>
                    <p className="truncate text-[12px] text-ink-400">
                      {s.email} · {s.listings} productos · {s.views30} visitas (30 d)
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      s.status === "SUSPENDED"
                        ? "bg-rose-500/15 text-rose-700"
                        : s.active
                          ? "bg-emerald-500/15 text-emerald-700"
                          : expired
                            ? "bg-amber-500/15 text-amber-800"
                            : "bg-ink-850 text-ink-400"
                    }`}
                  >
                    {s.status === "SUSPENDED"
                      ? "Suspendida"
                      : s.active
                        ? `${s.planName} · hasta ${fmt(s.activeUntil)}`
                        : expired
                          ? `Venció ${fmt(s.activeUntil)}`
                          : "Sin plan"}
                  </span>
                  {s.active && (
                    <Link href={`/tienda/${s.slug}`} target="_blank" className="text-[12px] font-semibold text-brand-600 hover:text-brand-700">
                      <ExternalLink className="inline h-3.5 w-3.5" strokeWidth={2} /> Ver
                    </Link>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-ink-800 pt-3">
                  <label
                    className="flex items-center gap-2 text-[12px] font-semibold text-ink-300"
                    title={s.planShowcase ? "" : "El plan de esta tienda no incluye vitrina"}
                  >
                    <Star className="h-3.5 w-3.5 text-gold-600" strokeWidth={2} />
                    Destacada en el inicio
                    <Switch
                      checked={s.featured}
                      disabled={!s.active || !s.planShowcase || busy === s.id}
                      onChange={(v) => call(s.id, `/api/admin/stores/${s.id}`, { action: "feature", value: v })}
                      label="Destacada"
                    />
                  </label>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} className="btn btn-secondary btn-sm">
                      <Gift className="h-4 w-4" strokeWidth={2} />
                      Regalar / extender
                    </button>
                    {s.status === "SUSPENDED" ? (
                      <button type="button" disabled={busy === s.id} onClick={() => call(s.id, `/api/admin/stores/${s.id}`, { action: "resume" })} className="btn btn-secondary btn-sm">
                        <Play className="h-4 w-4" strokeWidth={2} />
                        Reanudar
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => confirm(`¿Suspender la tienda de ${s.sellerName}? Deja de verse al instante.`) && call(s.id, `/api/admin/stores/${s.id}`, { action: "suspend" })}
                        className="btn btn-secondary btn-sm"
                      >
                        <Pause className="h-4 w-4" strokeWidth={2} />
                        Suspender
                      </button>
                    )}
                    {s.active && (
                      <button
                        type="button"
                        disabled={busy === s.id}
                        onClick={() => confirm(`¿Cortar el plan de ${s.sellerName} ahora mismo?`) && call(s.id, `/api/admin/stores/${s.id}`, { action: "revoke" })}
                        className="btn btn-secondary btn-sm !text-rose-700"
                      >
                        Cortar plan
                      </button>
                    )}
                  </div>
                </div>

                {open === s.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 rounded-xl bg-ink-900 p-3">
                    <label className="block">
                      <span className="field-label">Plan</span>
                      <select value={g.plan} onChange={(e) => setGrant((prev) => ({ ...prev, [s.id]: { ...g, plan: e.target.value } }))} className="input !w-auto !py-2">
                        {plans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="field-label">Meses</span>
                      <select value={g.months} onChange={(e) => setGrant((prev) => ({ ...prev, [s.id]: { ...g, months: Number(e.target.value) } }))} className="input !w-auto !py-2">
                        {[1, 2, 3, 6, 12].map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={busy === s.id}
                      onClick={() =>
                        call(s.id, `/api/admin/stores/${s.id}`, { action: "grant", planCode: g.plan, months: g.months, note: "Cortesía del administrador" }).then(() => setOpen(null))
                      }
                      className="btn btn-primary btn-sm"
                    >
                      Aplicar sin cobro
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {stores.length === 0 && (
            <p className="rounded-2xl border border-dashed border-ink-700 p-10 text-center text-[13px] text-ink-400">
              Todavía no hay vendedores.
            </p>
          )}
        </div>
      )}

      {/* PLANES */}
      {tab === "plans" && (
        <div className="space-y-4">
          {plans.map((p) => (
            <PlanForm key={p.id} plan={p} onSaved={() => router.refresh()} onError={setError} />
          ))}
        </div>
      )}
    </div>
  );
}
