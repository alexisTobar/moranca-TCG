"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export function ProductGallery({ title, imageUrl, imageUrls, isFoil = false }: {
  title: string; imageUrl: string | null; imageUrls: string[]; isFoil?: boolean;
}) {
  const images = [...new Set([imageUrl, ...imageUrls].filter((url): url is string => Boolean(url)))];
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];
  return <div>
    <div className="relative aspect-[63/88] overflow-hidden rounded-2xl border border-ink-700 bg-ink-950 tcg-card-shadow">
      {current ? <Image src={current} alt={`${title} · foto ${selected + 1}`} fill sizes="(max-width: 640px) 90vw, 380px" className="object-contain" priority unoptimized /> : <div className="flex h-full items-center justify-center text-ink-700"><ImageOff size={56} /></div>}
      {isFoil && selected === 0 && <span className="foil-shimmer foil-shimmer-auto" aria-hidden="true" />}
    </div>
    {images.length > 1 && <>
      <p className="mt-3 text-xs text-ink-400" aria-live="polite">Foto {selected + 1} de {images.length}</p>
      <div className="mt-2 flex flex-wrap gap-2" aria-label="Fotos del producto">
        {images.map((url, i) => <button key={url} type="button" onClick={() => setSelected(i)} aria-label={`Ver foto ${i + 1} de ${title}`} aria-pressed={selected === i} className={`relative h-20 w-16 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-brand-500 ${selected === i ? "border-brand-500" : "border-ink-700 hover:border-ink-400"}`}><Image src={url} alt="" fill sizes="64px" className="object-contain" unoptimized /></button>)}
      </div>
    </>}
  </div>;
}
