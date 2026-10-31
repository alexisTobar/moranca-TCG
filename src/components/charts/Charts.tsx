import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/** Paleta categórica validada (modo claro). Orden fijo: el color sigue a la entidad, nunca a su posición. */
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"] as const;

/** Variación porcentual frente al período anterior; null cuando no hay base para comparar. */
export function delta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return null;
  const max = Math.max(...values), W = 96, H = 28;
  const pts = values.map((v, i) => `${(i * W) / (values.length - 1)},${H - 2 - (max ? (v / max) * (H - 4) : 0)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-20 shrink-0" aria-hidden="true"><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

/** Cifra principal con su variación frente al período anterior y una mini tendencia. */
export function StatTile({ label, value, change, hint, trend, href, color = SERIES_COLORS[0] }: {
  label: string; value: string; change?: number | null; hint?: string; trend?: number[]; href?: string; color?: string;
}) {
  const Icon = change == null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = change == null || change === 0 ? "text-ink-400" : change > 0 ? "text-emerald-700" : "text-rose-700";
  const body = <>
    <div className="flex items-start justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">{label}</p>
      {trend && <Sparkline values={trend} color={color} />}
    </div>
    <p className="mt-1 font-display text-2xl font-bold text-carbon">{value}</p>
    {(change !== undefined || hint) && <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
      {change !== undefined && <span className={`inline-flex shrink-0 items-center gap-0.5 font-semibold ${tone}`}><Icon size={14} className="shrink-0" aria-hidden="true" />{change == null ? "Nuevo" : `${change > 0 ? "+" : ""}${change}%`}</span>}
      {hint && <span className="text-ink-400">{hint}</span>}
    </p>}
  </>;
  const cls = "block rounded-2xl card-surface p-5";
  return href ? <Link href={href} className={`${cls} transition hover:border-carbon`}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Ranking horizontal: la barra muestra la proporción y el valor siempre va escrito al lado. */
export function BarList({ rows, format = (n) => n.toLocaleString("es-CL"), empty = "Sin datos en este período", color = SERIES_COLORS[0] }: {
  rows: Array<{ label: string; value: number; href?: string; sub?: string }>; format?: (n: number) => string; empty?: string; color?: string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-400">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return <ol className="space-y-2.5">{rows.map((r) => {
    const inner = <>
      <span className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate font-medium text-carbon">{r.label}{r.sub && <span className="ml-1.5 font-normal text-ink-400">{r.sub}</span>}</span>
        <span className="shrink-0 font-semibold tabular-nums text-carbon">{format(r.value)}</span>
      </span>
      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-ink-850"><span className="block h-full rounded-full" style={{ width: `${Math.max(2, (100 * r.value) / max)}%`, background: color }} /></span>
    </>;
    return <li key={r.label} title={`${r.label}: ${format(r.value)}`}>{r.href ? <Link href={r.href} className="block rounded-lg transition hover:opacity-80">{inner}</Link> : inner}</li>;
  })}</ol>;
}

/** Reparto de un total en partes (por ejemplo, órdenes por estado): barra apilada con leyenda de cifras y porcentajes. */
export function Breakdown({ parts, format = (n) => n.toLocaleString("es-CL") }: {
  parts: Array<{ label: string; value: number; color: string }>; format?: (n: number) => string;
}) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  if (!total) return <p className="py-6 text-center text-sm text-ink-400">Sin datos en este período</p>;
  const shown = parts.filter((p) => p.value > 0);
  return <div>
    <div className="flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={shown.map((p) => `${p.label}: ${format(p.value)}`).join(", ")}>
      {shown.map((p) => <span key={p.label} title={`${p.label}: ${format(p.value)} (${Math.round((100 * p.value) / total)}%)`} style={{ width: `${(100 * p.value) / total}%`, background: p.color }} />)}
    </div>
    <ul className="mt-4 grid gap-2">{parts.map((p) => <li key={p.label} className="flex items-center justify-between gap-2 text-[13px]">
      <span className="flex items-center gap-2 text-ink-300"><span className="viz-swatch" style={{ background: p.color }} />{p.label}</span>
      <span className="tabular-nums"><strong className="text-carbon">{format(p.value)}</strong> <span className="text-ink-400">{Math.round((100 * p.value) / total)}%</span></span>
    </li>)}</ul>
  </div>;
}

/** Tarjeta contenedora de un gráfico, con título, subtítulo y acción opcional. */
export function ChartCard({ title, subtitle, action, children, className = "" }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return <section className={`rounded-2xl card-surface p-5 ${className}`}>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div><h2 className="font-display text-base font-bold text-carbon">{title}</h2>{subtitle && <p className="mt-0.5 text-[12px] text-ink-400">{subtitle}</p>}</div>
      {action}
    </div>
    {children}
  </section>;
}
