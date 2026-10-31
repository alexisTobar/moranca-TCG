"use client";

import { useId, useRef, useState } from "react";

export interface Series {
  name: string;
  /** Un valor por cada etiqueta de `labels`. */
  values: number[];
  color: string;
}

const FORMATS = {
  clp: (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`,
  int: (n: number) => Math.round(n).toLocaleString("es-CL"),
};

/** Escala "bonita" para el eje: 0, 1, 2, 5, 10, 20, 50… × 10ⁿ. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

/**
 * Serie temporal (línea con área suave) con eje Y único, cuadrícula tenue y cursor con tooltip.
 * Varias series comparten la misma unidad; para unidades distintas se usan gráficos separados.
 */
export function TimeSeriesChart({ labels, series, format = "int", height = 200, title }: {
  labels: string[]; series: Series[]; format?: keyof typeof FORMATS; height?: number; title: string;
}) {
  const fmt = FORMATS[format];
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, L = 52, R = 12, T = 12, B = 26;
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const n = labels.length;
  const x = (i: number) => L + (n <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (n - 1));
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(n / 6));
  const empty = series.every((s) => s.values.every((v) => v === 0));

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  return <figure className="viz" ref={box}>
    <figcaption className="sr-only">{title}</figcaption>
    {series.length > 1 && <ul className="viz-legend" aria-label="Series">
      {series.map((s) => <li key={s.name}><span className="viz-swatch" style={{ background: s.color }} />{s.name} <strong>{fmt(s.values.reduce((a, b) => a + b, 0))}</strong></li>)}
    </ul>}
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none" role="img" aria-labelledby={`${id}-desc`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <desc id={`${id}-desc`}>{title}. {series.map((s) => `${s.name}: total ${fmt(s.values.reduce((a, b) => a + b, 0))}`).join(". ")}</desc>
        <defs>{series.map((s, si) => <linearGradient key={s.name} id={`${id}-g${si}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={s.color} stopOpacity={series.length > 1 ? 0.12 : 0.22} /><stop offset="1" stopColor={s.color} stopOpacity="0" />
        </linearGradient>)}</defs>
        {ticks.map((t) => <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="viz-grid" />
          <text x={L - 8} y={y(t) + 4} textAnchor="end" className="viz-axis">{format === "clp" && t >= 1000 ? `$${Math.round(t / 1000).toLocaleString("es-CL")}k` : fmt(t)}</text>
        </g>)}
        {labels.map((label, i) => i % labelEvery === 0 || i === n - 1 ? <text key={label} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="viz-axis">{label}</text> : null)}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`);
          return <g key={s.name}>
            {n > 1 && <path d={`M${x(0)},${y(0)} L${pts.join(" L")} L${x(n - 1)},${y(0)} Z`} fill={`url(#${id}-g${si})`} />}
            <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </g>;
        })}
        {hover !== null && <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="viz-crosshair" />
          {series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4.5" fill={s.color} stroke="#fff" strokeWidth="2" />)}
        </g>}
      </svg>
      {hover !== null && <div className="viz-tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} data-side={hover > n / 2 ? "left" : "right"}>
        <p className="viz-tooltip-title">{labels[hover]}</p>
        {series.map((s) => <p key={s.name}><span className="viz-swatch" style={{ background: s.color }} />{series.length > 1 ? `${s.name}: ` : ""}<strong>{fmt(s.values[hover] ?? 0)}</strong></p>)}
      </div>}
      {empty && <p className="viz-empty">Sin movimiento en este período</p>}
    </div>
  </figure>;
}
