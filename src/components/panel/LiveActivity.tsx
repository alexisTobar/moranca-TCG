"use client";

import { useEffect, useState } from "react";

interface Live {
  visitors: number;
  pages: Array<{ page: string; views: number }>;
  recent: Array<{ id: string; term: string; game: string | null; results: number; at: string }>;
  top: Array<{ term: string; count: number }>;
  empty: Array<{ term: string; count: number }>;
}

const POLL_MS = 10_000;

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return s < 60 ? `hace ${s} s` : `hace ${Math.round(s / 60)} min`;
}

/** Panel en vivo del admin: se actualiza solo cada 10 s mientras la pestaña está visible. */
export function LiveActivity() {
  const [data, setData] = useState<Live | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/admin/live", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const json = (await res.json()) as Live;
        if (alive) { setData(json); setFailed(false); }
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    document.addEventListener("visibilitychange", load);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", load); };
  }, []);

  return (
    <section className="rounded-2xl card-surface p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
          En vivo
        </h2>
        <p className="text-xs text-ink-400">{failed ? "Sin conexión, reintentando…" : "Se actualiza cada 10 segundos · solo usuarios que aceptaron estadísticas"}</p>
      </div>
      {!data ? <p className="mt-4 text-sm text-ink-400">Cargando actividad…</p> : (
        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-xs text-ink-400">Visitantes activos (últimos 5 min)</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums">{data.visitors}</p>
            {data.pages.length > 0 && <ul className="mt-3 space-y-1 text-sm">{data.pages.map((p) => <li key={p.page} className="flex justify-between capitalize"><span>{p.page}</span><span className="tabular-nums text-ink-400">{p.views}</span></li>)}</ul>}
          </div>
          <div>
            <p className="text-xs text-ink-400">Búsquedas ahora (última hora)</p>
            {data.recent.length ? <ul className="mt-2 divide-y divide-ink-800 text-sm">{data.recent.map((r) => <li key={r.id} className="flex justify-between gap-3 py-1.5"><span className="truncate">{r.term}{r.results === 0 && <span className="ml-2 text-xs font-semibold text-brand-600">sin resultados</span>}</span><span className="shrink-0 text-xs text-ink-400">{ago(r.at)}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink-400">Nadie ha buscado en la última hora.</p>}
          </div>
          <div>
            <p className="text-xs text-ink-400">Más buscado hoy (24 h)</p>
            {data.top.length ? <ol className="mt-2 divide-y divide-ink-800 text-sm">{data.top.map((t, i) => <li key={t.term} className="flex justify-between gap-3 py-1.5"><span className="truncate">{i + 1}. {t.term}</span><span className="shrink-0 tabular-nums text-ink-400">{t.count}</span></li>)}</ol> : <p className="mt-2 text-sm text-ink-400">Sin búsquedas todavía.</p>}
            {data.empty.length > 0 && <p className="mt-3 text-xs text-ink-400">Sin resultados: {data.empty.map((e) => `${e.term} (${e.count})`).join(", ")}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
