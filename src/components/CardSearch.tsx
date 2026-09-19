"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff, Search, X } from "lucide-react";
import { GAME_LIST, type GameId } from "@/lib/games";
import { clp } from "@/lib/format";
import { MYL_FORMATOS } from "@/lib/providers/myl-formatos";

const MAGIC_COLORS = [
  { value: "w", label: "Blanco" },
  { value: "u", label: "Azul" },
  { value: "b", label: "Negro" },
  { value: "r", label: "Rojo" },
  { value: "g", label: "Verde" },
  { value: "c", label: "Incoloro" },
];

interface MagicSetOption {
  code: string;
  name: string;
}

export interface CardResult {
  externalId: string;
  name: string;
  imageUrl: string;
  imageLarge?: string;
  setName?: string;
  setCode?: string;
  cardNumber?: string;
  code?: string;
  rarity?: string;
  game: GameId;
  extra?: string;
  color?: string;
  family?: string;
  description?: string;
  illustrator?: string;
  priceUsd?: number | null;
  priceUsdFoil?: number | null;
  priceClp?: number | null;
  priceClpFoil?: number | null;
  priceSource?: string;
}

interface Props {
  game: GameId;
  onGameChange: (game: GameId) => void;
  onPick: (card: CardResult) => void;
  label?: string;
  hint?: string;
}

const STEP = 24;

export function CardSearch({ game, onGameChange, onPick, label, hint }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [visible, setVisible] = useState(STEP);
  const [formato, setFormato] = useState("");
  const [color, setColor] = useState("");
  const [edition, setEdition] = useState("");
  const [magicSets, setMagicSets] = useState<MagicSetOption[]>([]);
  const [usdClp, setUsdClp] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ game: GameId; count: number; sample: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Magic puede filtrar solo por color/edición sin escribir un nombre.
  const hasMagicFilters = game === "magic" && (color !== "" || edition !== "");

  useEffect(() => {
    if (game !== "magic" || magicSets.length > 0) return;
    fetch("/api/cards/magic-sets")
      .then((r) => r.json())
      .then((data) => setMagicSets(data.sets ?? []))
      .catch(() => {});
  }, [game, magicSets.length]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 && !hasMagicFilters) {
      setResults([]);
      setSuggestions([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      setTouched(true);

      try {
        const params = new URLSearchParams({ game, q: term, limit: "120" });
        if (formato) params.set("format", formato);
        if (game === "magic" && color) params.set("color", color);
        if (game === "magic" && edition) params.set("edition", edition);

        const res = await fetch(`/api/cards/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error en la búsqueda");
        setResults(data.results ?? []);
        setSuggestions(data.suggestions ?? []);
        setUsdClp(data.usdClp ?? null);
        setVisible(STEP);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, game, formato, color, edition, hasMagicFilters]);

  return (
    <div className="rounded-3xl card-surface p-4 sm:p-6">
      <div>
        <h3 className="font-display text-[17px] font-bold text-carbon">
          {label ?? "Buscar la carta"}
        </h3>
        <p className="mt-1 text-[13px] text-ink-400">
          {hint ??
            "Escribe el nombre y elige la impresión correcta. La imagen se toma del catálogo oficial."}
        </p>
      </div>

      <div className="no-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {GAME_LIST.map((g) => (
          <button
            key={g.id}
            type="button"
            data-active={game === g.id}
            onClick={() => {
              onGameChange(g.id);
              setResults([]);
              setFormato("");
              setColor("");
              setEdition("");
            }}
            className="pill shrink-0"
          >
            {g.short}
          </button>
        ))}
      </div>

      {/* Magic: filtro por color y edición */}
      {game === "magic" && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <div className="no-scrollbar -mx-1 flex max-w-full items-center gap-1.5 overflow-x-auto px-1">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Color
            </span>
            <button
              type="button"
              data-active={color === ""}
              onClick={() => setColor("")}
              className="pill shrink-0 !px-3 !py-1"
            >
              Todos
            </button>
            {MAGIC_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                data-active={color === c.value}
                onClick={() => setColor(c.value)}
                className="pill shrink-0 !px-3 !py-1"
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Edición
            </span>
            <select
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              className="input !w-auto !py-1.5 !text-[12px] font-semibold"
            >
              <option value="">Todas</option>
              {magicSets.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Mitos y Leyendas: filtro por formato competitivo */}
      {game === "myl" && (
        <div className="no-scrollbar -mx-1 mt-3 flex items-center gap-1.5 overflow-x-auto px-1">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-ink-400">
            Formato
          </span>
          <button
            type="button"
            data-active={formato === ""}
            onClick={() => setFormato("")}
            className="pill shrink-0 !px-3 !py-1"
          >
            Todos
          </button>
          {MYL_FORMATOS.map((f) => (
            <button
              key={f}
              type="button"
              data-active={formato === f}
              onClick={() => setFormato(f)}
              className="pill shrink-0 !px-3 !py-1"
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Buscador */}
      <div className="relative mt-4">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-500"
          strokeWidth={2}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            game === "myl"
              ? "Nombre de la carta. Ej: Arturo, Excalibur…"
              : "Nombre o código. Ej: Luffy, OP01-024, Charizard…"
          }
          aria-label="Buscar carta"
          enterKeyHint="search"
          autoComplete="off"
          className="input !rounded-full !py-3.5 !pl-11 !pr-24 !text-[15px] shadow-sm"
        />
        <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {loading && (
            <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-brand-500 border-t-transparent" />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-850 text-ink-400 transition hover:bg-ink-800 hover:text-carbon"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {/* Esqueletos mientras carga la primera búsqueda */}
      {loading && results.length === 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-ink-800">
              <div className="animate-pulse bg-ink-850" style={{ paddingTop: "139.68%" }} />
              <div className="space-y-2 p-2.5">
                <div className="h-3 w-4/5 animate-pulse rounded bg-ink-850" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-ink-850" />
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 pt-4">
            <p className="text-[13px] text-ink-400">
              <strong className="text-carbon">{results.length}</strong>{" "}
              {results.length === 1 ? "versión encontrada" : "versiones encontradas"}
              {results.length > visible && <span> · mostrando {visible}</span>}
            </p>
            {usdClp && (
              <p className="text-[11px] text-ink-400">
                Precio referencial TCGplayer · dólar ${usdClp.toLocaleString("es-CL")}
              </p>
            )}
          </div>

          {/* En móvil scrollea la página; el scroll interno solo se usa en pantallas grandes */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-h-[560px] sm:grid-cols-3 sm:overflow-y-auto sm:pr-1 lg:grid-cols-5">
            {results.slice(0, visible).map((card, i) => (
              <button
                key={`${card.externalId}-${i}`}
                type="button"
                onClick={() => onPick(card)}
                className="group lift block overflow-hidden rounded-2xl border border-ink-800 bg-white text-left"
                title={`${card.name}${card.code ? ` — ${card.code}` : ""}`}
              >
                {/* Proporción 63:88 con padding-top: funciona igual en todos los navegadores móviles */}
                <span
                  className="relative block w-full overflow-hidden bg-ink-850"
                  style={{ paddingTop: "139.68%" }}
                >
                  <CardImage src={card.imageUrl} alt={card.name} />
                  {card.rarity && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-carbon/75 px-2 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur">
                      {card.rarity}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-carbon/0 text-[12px] font-bold text-white opacity-0 transition group-hover:bg-carbon/70 group-hover:opacity-100">
                    Seleccionar
                  </span>
                </span>

                <span className="block space-y-1 p-2.5">
                  <span className="line-clamp-2 block text-[12px] font-semibold leading-tight text-ink-200">
                    {card.name}
                  </span>

                  {card.code && (
                    <span className="block w-fit rounded bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-tight text-ink-300">
                      {card.code}
                    </span>
                  )}

                  <span className="line-clamp-1 block text-[10px] text-ink-400">
                    {card.setName ?? ""}
                  </span>

                  {MYL_FORMATOS.filter((f) => card.extra?.includes(f)).map((f) => (
                    <span
                      key={f}
                      className="mr-1 inline-block rounded bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-ink-300"
                    >
                      {f}
                    </span>
                  ))}

                  {(card.priceClp || card.priceClpFoil) && (
                    <span className="block pt-0.5 text-[11px] leading-tight">
                      {card.priceClp && (
                        <span className="block font-bold text-brand-600">
                          {clp(card.priceClp)}
                          <span className="font-normal text-ink-400">
                            {" "}
                            · US${card.priceUsd?.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {card.priceClpFoil && (
                        <span className="block text-ink-400">Foil {clp(card.priceClpFoil)}</span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {results.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + STEP * 2)}
              className="btn btn-secondary mt-4 w-full"
            >
              Mostrar más versiones ({results.length - visible} restantes)
            </button>
          )}
        </>
      )}

      {touched &&
        !loading &&
        !error &&
        results.length === 0 &&
        (query.trim().length >= 2 || hasMagicFilters) && (
          <div className="mt-4 rounded-2xl border border-ink-800 bg-ink-900 p-4">
            <p className="text-[13px] text-ink-400">
              {query.trim() ? (
                <>
                  Sin resultados para <strong className="text-ink-200">“{query}”</strong>{" "}
                </>
              ) : (
                "Sin resultados con esos filtros "
              )}
              en {GAME_LIST.find((g) => g.id === game)?.short}.
            </p>

            {suggestions.length > 0 ? (
              <>
                <p className="mt-2 text-[13px] font-semibold text-ink-200">
                  Pero sí está en otro juego:
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestions.map((s) => {
                    const meta = GAME_LIST.find((g) => g.id === s.game);
                    if (!meta) return null;
                    return (
                      <button
                        key={s.game}
                        type="button"
                        onClick={() => onGameChange(s.game)}
                        className="pill !py-1.5"
                      >
                        {s.sample && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.sample}
                            alt=""
                            width={22}
                            height={31}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="rounded-sm object-cover"
                          />
                        )}
                        Buscar en {meta.short}
                        <span className="font-normal text-ink-400">
                          ({s.count}
                          {s.count >= 12 ? "+" : ""})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-1 text-[13px] text-ink-400">
                Revisa la ortografía o prueba con el nombre en inglés.
              </p>
            )}
          </div>
        )}
    </div>
  );
}

/**
 * Imagen de carta con <img> nativo: se ve igual en cualquier navegador móvil y,
 * si el catálogo remoto falla, muestra un recuadro en lugar de quedar en blanco.
 */
function CardImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-ink-500">
        <ImageOff className="h-7 w-7" strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Sin imagen</span>
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
    />
  );
}
