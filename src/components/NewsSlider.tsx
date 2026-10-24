"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel } from "@/lib/news/category";
import { NewsImage } from "./news/NewsImage";

export interface NewsSlide {
  id: string; category: string; title: string; excerpt: string; imageUrl: string | null;
  sourceName: string; publishedAt: string; country?: string | null; kind?: string; eventAt?: string | null;
}

export function NewsSlider({ items }: { items: NewsSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || hovered || reduced || items.length <= 1) return;
    const timer = setInterval(() => setIndex(i => (i + 1) % items.length), 8000);
    return () => clearInterval(timer);
  }, [paused, hovered, reduced, items.length]);
  if (!items.length) return null;
  const position = index % items.length;
  const current = items[position];
  const move = (delta:number) => { setPaused(true); setIndex((position+delta+items.length)%items.length); };
  return <div className="news-feature" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setPaused(true)}>
    <Link href={`/noticias/${current.id}`} className="news-feature-link">
      <div className="news-feature-art"><NewsImage src={current.imageUrl} title={current.title} category={current.category} kind={current.kind} priority /></div>
      <div className="news-feature-copy">
        <p className="text-sm font-semibold text-brand-600">{current.country === "CL" ? "Chile · " : ""}{newsCategoryLabel(current.category)}</p>
        <h3 className="mt-3 font-display text-xl font-bold leading-snug text-carbon sm:text-2xl">{current.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">{current.excerpt}</p>
        <p className="mt-4 text-xs text-ink-400">{current.sourceName} · {current.eventAt ? `Evento: ${new Date(current.eventAt).toLocaleDateString("es-CL",{timeZone:"America/Santiago"})}` : timeAgo(current.publishedAt)}</p>
        <span className="mt-5 inline-block text-sm font-semibold text-brand-600 underline underline-offset-4">Ver noticia y fuente</span>
      </div>
    </Link>
    {items.length > 1 && <div className="news-feature-controls">
      <p className="text-xs text-ink-400" aria-live={paused ? "polite" : "off"}>Noticia {position+1} de {items.length}</p>
      <div className="flex items-center gap-2">
        {!reduced && <button type="button" className="icon-btn" aria-label={paused ? "Reanudar noticias" : "Pausar noticias"} onClick={() => setPaused(v => !v)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>}
        <button type="button" className="icon-btn" aria-label="Noticia anterior" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
        <button type="button" className="icon-btn" aria-label="Siguiente noticia" onClick={() => move(1)}><ChevronRight size={18} /></button>
      </div>
    </div>}
  </div>;
}
