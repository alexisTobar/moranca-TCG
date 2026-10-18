"use client";

import Image from "next/image";
import { useState } from "react";

/** Reserves the card's space and keeps its name usable if a provider fails. */
export function CardArtwork({ src, alt, sizes, priority = false, className = "" }: {
  src: string | null; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const [direct, setDirect] = useState<string | null>(null);
  const canOptimize = !!src && /^https:\/\/(cards\.scryfall\.io|images\.pokemontcg\.io|static\.dotgg\.gg|api\.myl\.cl|assets\.tcgdex\.net)\//.test(src);
  if (!src || failed === src) return <span role="img" aria-label={`${alt}: imagen no disponible`} className="artwork-fallback"><span>{alt}</span><small>Imagen no disponible</small></span>;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} unoptimized={!canOptimize || direct === src} onError={() => { if (canOptimize && direct !== src) setDirect(src); else setFailed(src); }} />;
}
