"use client";

import Image from "next/image";
import { CalendarDays, Newspaper, Sparkles } from "lucide-react";
import { useState } from "react";
import { GAMES } from "@/lib/games";
import { newsCategoryLabel } from "@/lib/news/category";

export function NewsImage({ src, title, category, kind = "NEWS", priority = false }: {
  src: string | null; title: string; category: string; kind?: string; priority?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  // Previously imported generic card artwork is not an illustration of an article.
  const stockImage = Object.values(GAMES).some(game => game.cardImage === src);
  const valid = src && failed !== src && !stockImage;
  const Icon = kind === "TOURNAMENT" ? CalendarDays : kind === "RELEASE" ? Sparkles : Newspaper;
  return valid ? <Image src={src} alt={title} fill sizes="(max-width:639px) 100vw, (max-width:1023px) 50vw, 33vw" className="object-cover" unoptimized priority={priority} onError={() => setFailed(src)} />
    : <div className={`news-image-fallback ${category === "ONEPIECE" ? "news-image-onepiece" : category === "POKEMON" ? "news-image-pokemon" : ""}`}>
      <Icon size={32} strokeWidth={1.5} aria-hidden="true" />
      <span>{newsCategoryLabel(category)}</span>
      <small>{kind === "TOURNAMENT" ? "Torneos y comunidad" : kind === "RELEASE" ? "Nuevos lanzamientos" : "Noticias del juego"}</small>
    </div>;
}
