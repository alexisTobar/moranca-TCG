"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Languages, Loader2, X } from "lucide-react";
import { CardArtwork } from "@/components/CardArtwork";

export interface DeckGridCard {
  id: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  externalId: string | null;
}

interface CardText {
  name: string;
  stats: string[];
  family?: string;
  text?: string;
  textEs?: string;
  esSource?: "official" | "translated";
}

type Loaded = { state: "loading" } | { state: "ok"; data: CardText } | { state: "none" };

/** Versión en alta de la misma imagen, cuando el proveedor la ofrece. */
function largeImage(src: string): string {
  if (src.includes("images.pokemontcg.io") && !src.includes("_hires")) return src.replace(/\.png$/, "_hires.png");
  if (src.includes("assets.tcgdex.net")) return src.replace(/\/low\.webp$/, "/high.webp");
  if (src.includes("cards.scryfall.io/normal/")) return src.replace("/normal/", "/large/");
  return src;
}

/** Colores de las etiquetas como vienen impresas en One Piece: DON!! negro, Contraataque rojo, Activador amarillo, el resto azul. */
function keywordClass(word: string): string {
  if (/^DON!!/i.test(word)) return "bg-carbon text-paper";
  if (/^(Contraataque|Counter)$/i.test(word)) return "bg-rose-600 text-white";
  if (/^(Activador|Trigger)$/i.test(word)) return "bg-amber-400 text-carbon";
  return "bg-blue-600 text-white";
}

/** Pinta las palabras clave entre corchetes ([Al jugar], [DON!! x1]) como etiquetas del juego. */
function AbilityText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[14px] leading-relaxed text-ink-200">
      {text.split("\n").filter((l) => l.trim()).map((line, i) => (
        <p key={i}>
          {line.split(/(\[[^\]]+\])/g).map((part, j) =>
            /^\[[^\]]+\]$/.test(part) ? (
              <span key={j} className={`mx-0.5 inline-block rounded-md px-1.5 py-px text-[12px] font-bold ${keywordClass(part.slice(1, -1))}`}>
                {part.slice(1, -1)}
              </span>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

export function DeckCardGrid({ cards, game }: { cards: DeckGridCard[]; game: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [texts, setTexts] = useState<Record<string, Loaded>>({});
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const card = open != null ? cards[open] : null;
  const loaded = card?.externalId ? texts[card.externalId] : undefined;

  const load = useCallback(
    (c: DeckGridCard | undefined) => {
      const id = c?.externalId;
      if (!id) return;
      setTexts((prev) => {
        if (prev[id]) return prev;
        fetch(`/api/cards/text?game=${encodeURIComponent(game)}&id=${encodeURIComponent(id)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject()))
          .then((data: CardText) => setTexts((p) => ({ ...p, [id]: data.text ? { state: "ok", data } : { state: "none" } })))
          .catch(() => setTexts((p) => ({ ...p, [id]: { state: "none" } })));
        return { ...prev, [id]: { state: "loading" } };
      });
    },
    [game]
  );

  const show = useCallback(
    (i: number) => {
      const n = (i + cards.length) % cards.length;
      setOpen(n);
      load(cards[n]);
      // La siguiente se pide de antemano para que al avanzar ya esté.
      load(cards[(n + 1) % cards.length]);
    },
    [cards, load]
  );

  const close = useCallback(() => {
    setOpen(null);
    returnFocus.current?.focus();
  }, []);

  useEffect(() => {
    if (open == null) return;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") show(open + 1);
      else if (e.key === "ArrowLeft") show(open - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, show, close]);

  const data = loaded?.state === "ok" ? loaded.data : null;
  const shownText = data ? (lang === "es" ? data.textEs ?? data.text : data.text) : undefined;

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {cards.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={(e) => {
              returnFocus.current = e.currentTarget;
              show(i);
            }}
            aria-label={`Ver ${c.name} en grande`}
            className="group relative cursor-zoom-in overflow-hidden rounded-lg border border-ink-700 bg-ink-950 text-left transition hover:border-carbon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <div className="relative aspect-[63/88]">
              {c.imageUrl ? (
                <CardArtwork src={c.imageUrl} alt={c.name} sizes="150px" className="object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-700">
                  <ImageOff className="h-6 w-6" strokeWidth={1.5} />
                </div>
              )}
              <span className="deck-copy-badge">
                {c.quantity}<span className="sr-only"> {c.quantity === 1 ? "copia" : "copias"}</span>
              </span>
            </div>
            <p className="line-clamp-2 px-1.5 py-1 text-[10px] leading-tight text-ink-300">{c.name}</p>
          </button>
        ))}
      </div>

      {card && open != null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-carbon/75 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={card.name}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row">
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 text-ink-400 shadow hover:text-carbon"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>

            {/* Carta en grande */}
            <div className="relative flex shrink-0 items-center justify-center bg-ink-950 p-4 md:w-[46%] md:p-6">
              <div className="relative aspect-[63/88] w-full max-w-[200px] overflow-hidden rounded-xl shadow-xl sm:max-w-[260px] md:max-w-[360px]">
                {card.imageUrl ? (
                  <CardArtwork key={card.id} src={largeImage(card.imageUrl)} alt={card.name} sizes="(min-width: 768px) 360px, 260px" priority className="object-contain" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-700">
                    <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              {cards.length > 1 && (
                <>
                  <button type="button" onClick={() => show(open - 1)} aria-label="Carta anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-carbon shadow hover:bg-white">
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                  <button type="button" onClick={() => show(open + 1)} aria-label="Carta siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-carbon shadow hover:bg-white">
                    <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                </>
              )}
            </div>

            {/* Datos y habilidad */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-400">
                {open + 1} de {cards.length} · {card.quantity} {card.quantity === 1 ? "copia" : "copias"} en el mazo
              </p>
              <h3 className="mt-1 pr-8 font-display text-2xl font-bold leading-tight text-carbon">{card.name}</h3>
              {card.externalId && <p className="mt-0.5 text-[12px] text-ink-400">{card.externalId.toUpperCase()}</p>}

              {data && (data.stats.length > 0 || data.family) && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {data.stats.map((s) => (
                    <span key={s} className="rounded-full border border-ink-700 px-2.5 py-0.5 text-[11px] font-semibold text-ink-300">{s}</span>
                  ))}
                  {data.family && <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-[11px] font-medium text-ink-300">{data.family}</span>}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink-300">Habilidad</h4>
                {data?.text && data.textEs && data.textEs !== data.text && (
                  <div role="group" aria-label="Idioma del texto" className="inline-flex rounded-lg border border-ink-700 p-0.5 text-[12px] font-semibold">
                    {(["es", "en"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={lang === l}
                        onClick={() => setLang(l)}
                        className={`rounded-md px-2.5 py-1 transition ${lang === l ? "bg-carbon text-paper" : "text-ink-400 hover:text-carbon"}`}
                      >
                        {l === "es" ? "Español" : "English"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-2 rounded-xl card-surface p-4">
                {!card.externalId || loaded?.state === "none" ? (
                  <p className="text-[13px] text-ink-400">No tenemos el texto de esta carta. Puedes leerlo en la imagen ampliada.</p>
                ) : !loaded || loaded.state === "loading" ? (
                  <p className="flex items-center gap-2 text-[13px] text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando habilidad…
                  </p>
                ) : shownText ? (
                  <AbilityText text={shownText} />
                ) : (
                  <p className="text-[13px] text-ink-400">Esta carta no tiene habilidad.</p>
                )}
              </div>

              {data?.textEs && lang === "es" && data.textEs !== data.text && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-400">
                  <Languages className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {data.esSource === "official"
                    ? "Texto oficial de la versión en español."
                    : "Traducción con los términos del juego. Ante dudas, manda el texto en inglés."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
