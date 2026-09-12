"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { newsCategoryLabel, newsCategoryColor } from "@/lib/news/category";

export interface NewsSlide {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  imageUrl: string | null;
  sourceName: string;
  publishedAt: string;
}

const AUTOPLAY_MS = 6000;

export function NewsSlider({ items }: { items: NewsSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused || items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, items.length]);

  if (items.length === 0) return null;
  const current = items[index];

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-ink-700 tcg-card-shadow"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link
        href={`/noticias/${current.id}`}
        className="relative block h-[280px] w-full sm:h-[320px]"
      >
        {current.imageUrl ? (
          <Image
            src={current.imageUrl}
            alt={current.title}
            fill
            sizes="(max-width:768px) 100vw, 1000px"
            className="object-cover"
            unoptimized
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-ink-900">
            <Newspaper className="h-12 w-12 text-ink-700" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <span
            className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-paper"
            style={{ background: newsCategoryColor(current.category) }}
          >
            {newsCategoryLabel(current.category)}
          </span>
          <h3 className="mt-2 line-clamp-2 font-display text-lg font-bold text-white sm:text-2xl">
            {current.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 max-w-2xl text-[12px] leading-relaxed text-white/80 sm:text-[13px]">
            {current.excerpt}
          </p>
          <p className="mt-2 text-[11px] text-white/60">
            {current.sourceName} · {timeAgo(current.publishedAt)}
          </p>
        </div>
      </Link>

      {items.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Noticia anterior"
            onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
            className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 group-hover:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            aria-label="Siguiente noticia"
            onClick={() => setIndex((i) => (i + 1) % items.length)}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition hover:bg-black/60 group-hover:opacity-100"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </button>

          <div className="absolute bottom-3 right-4 flex gap-1.5 sm:bottom-4">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                aria-label={`Ir a la noticia ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
