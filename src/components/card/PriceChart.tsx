"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { clp } from "@/lib/format";

export interface HistoryPoint {
  day: string;
  min: number;
  market: number;
  max: number;
  listings: number;
}

const RANGES = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1A", days: 365 },
];

const W = 640;
const H = 220;
const PAD = { l: 62, r: 14, t: 16, b: 28 };

function dayLabel(day: string): string {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

/** Historial de precio: línea de mercado (mediana) y de mínimo, por idioma y rango. */
export function PriceChart({
  history,
  languageLabels,
}: {
  history: Record<string, HistoryPoint[]>;
  languageLabels: Record<string, string>;
}) {
  const langs = Object.keys(history);
  const [lang, setLang] = useState(history["*"] ? "*" : langs[0]);
  const [days, setDays] = useState(90);
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(() => {
    const all = history[lang] ?? [];
    const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return all.filter((p) => p.day >= since);
  }, [history, lang, days]);

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.flatMap((p) => [p.min, p.market]);
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (lo === hi) {
      lo = Math.max(0, lo - lo * 0.1 - 100);
      hi = hi + hi * 0.1 + 100;
    }
    const x = (i: number) =>
      PAD.l + (points.length === 1 ? (W - PAD.l - PAD.r) / 2 : (i / (points.length - 1)) * (W - PAD.l - PAD.r));
    const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const line = (key: "market" | "min") =>
      points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
    const marketPath = line("market");
    const area = `${marketPath} L${x(points.length - 1).toFixed(1)},${H - PAD.b} L${x(0).toFixed(1)},${H - PAD.b} Z`;
    const ticks = [0, 0.5, 1].map((t) => ({ v: Math.round(lo + (hi - lo) * t), y: y(lo + (hi - lo) * t) }));
    return { x, y, marketPath, minPath: line("min"), area, ticks };
  }, [points]);

  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last && first.market > 0 ? ((last.market - first.market) / first.market) * 100 : 0;
  const shown = hover != null ? points[hover] : last;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              data-active={lang === l}
              onClick={() => setLang(l)}
              className="pill !px-3 !py-1"
            >
              {languageLabels[l] ?? l}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              data-active={days === r.days}
              onClick={() => setDays(r.days)}
              className="pill !px-2.5 !py-1"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {shown && (
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="font-display text-2xl font-bold text-carbon">{clp(shown.market)}</p>
          {hover == null && points.length > 1 && (
            <span
              className={`inline-flex items-center gap-1 text-[12px] font-bold ${
                change > 0.05 ? "text-rose-600" : change < -0.05 ? "text-emerald-600" : "text-ink-400"
              }`}
            >
              {change > 0.05 ? (
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={2.25} />
              ) : change < -0.05 ? (
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={2.25} />
              ) : (
                <Minus className="h-3.5 w-3.5" strokeWidth={2.25} />
              )}
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}% en el período
            </span>
          )}
          <span className="text-[12px] text-ink-400">
            {dayLabel(shown.day)} · mín. {clp(shown.min)} · {shown.listings}{" "}
            {shown.listings === 1 ? "oferta" : "ofertas"}
          </span>
        </div>
      )}

      {geometry && points.length > 0 ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mt-3 w-full touch-pan-y select-none"
          role="img"
          aria-label="Gráfico del historial de precio"
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            if (points.length === 1) return setHover(0);
            const ratio = (px - PAD.l) / (W - PAD.l - PAD.r);
            setHover(Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1)))));
          }}
        >
          <defs>
            <linearGradient id="pc-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geometry.ticks.map((t) => (
            <g key={t.v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="var(--color-ink-800)" strokeDasharray="3 4" />
              <text x={PAD.l - 8} y={t.y + 4} textAnchor="end" fontSize="11" fill="var(--color-ink-400)">
                {clp(t.v)}
              </text>
            </g>
          ))}
          {points.length > 1 && <path d={geometry.area} fill="url(#pc-fill)" />}
          {points.length > 1 && (
            <path d={geometry.minPath} fill="none" stroke="var(--color-emerald-500, #10b981)" strokeWidth="1.5" strokeDasharray="4 4" />
          )}
          {points.length > 1 && (
            <path d={geometry.marketPath} fill="none" stroke="var(--color-brand-600)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          )}
          {points.map((p, i) => (
            <circle
              key={p.day}
              cx={geometry.x(i)}
              cy={geometry.y(p.market)}
              r={hover === i || points.length === 1 ? 5 : points.length < 15 ? 3 : 0}
              fill="var(--color-brand-600)"
              stroke="#fff"
              strokeWidth="2"
            />
          ))}
          {first && (
            <text x={PAD.l} y={H - 8} fontSize="11" fill="var(--color-ink-400)">
              {dayLabel(first.day)}
            </text>
          )}
          {last && points.length > 1 && (
            <text x={W - PAD.r} y={H - 8} textAnchor="end" fontSize="11" fill="var(--color-ink-400)">
              {dayLabel(last.day)}
            </text>
          )}
        </svg>
      ) : (
        <p className="mt-4 rounded-xl bg-ink-900 p-4 text-[13px] text-ink-400">
          No hay registros en este período.
        </p>
      )}

      {points.length <= 1 && geometry && (
        <p className="mt-2 text-[12px] text-ink-400">
          El historial se va armando día a día: cada día guardamos el precio de esta carta y aquí verás
          cómo evoluciona.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-brand-600" /> Precio de mercado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded border-t-2 border-dashed border-emerald-500" /> Precio mínimo
        </span>
      </div>
    </div>
  );
}
