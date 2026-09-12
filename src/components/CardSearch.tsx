"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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
  }, [query, game, formato, color, edition]);

  return (
    <div className="rounded-2xl card-surface p-5">
      <div>
        <h3 className="text-sm font-semibold text-carbon">
          {label ?? "Buscar la carta"}
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-400">
          {hint ??
            "Escribe el nombre y elige la impresión correcta. La imagen se toma del catálogo oficial."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {GAME_LIST.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              onGameChange(g.id);
              setResults([]);
              setFormato("");
              setColor("");
              setEdition("");
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition ${
              game === g.id
                ? "border-carbon bg-carbon text-paper"
                : "border-ink-700 text-ink-400 hover:border-ink-600 hover:text-ink-200"
            }`}
          >
            {g.short}
          </button>
        ))}
      </div>

      {/* Magic: filtro por color y edición */}
      {game === "magic" && (
        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Color
            </span>
            <button
              type="button"
              onClick={() => setColor("")}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                color === ""
                  ? "border-carbon bg-carbon text-paper"
                  : "border-ink-700 text-ink-400 hover:text-ink-200"
              }`}
            >
              Todos
            </button>
            {MAGIC_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                  color === c.value
                    ? "border-carbon bg-carbon text-paper"
                    : "border-ink-700 text-ink-400 hover:text-ink-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
              Edición
            </span>
            <select
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              className="rounded-md border border-ink-700 bg-white px-2 py-1 text-[11px] font-semibold text-ink-200 outline-none focus:border-carbon"
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
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">
            Formato
          </span>
          <button
            type="button"
            onClick={() => setFormato("")}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
              formato === ""
                ? "border-carbon bg-carbon text-paper"
                : "border-ink-700 text-ink-400 hover:text-ink-200"
            }`}
          >
            Todos
          </button>
          {MYL_FORMATOS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormato(f)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold transition ${
                formato === f
                  ? "border-carbon bg-carbon text-paper"
                  : "border-ink-700 text-ink-400 hover:text-ink-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            game === "myl"
              ? "Nombre de la carta. Ej: Arturo, Excalibur…"
              : "Nombre o código. Ej: Luffy, OP01-024, Charizard…"
          }
          className="w-full rounded-lg border border-ink-700 bg-white px-3 py-2.5 pr-24 text-sm text-ink-200 outline-none transition focus:border-carbon"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-[11px] font-semibold text-ink-400">
            <span className="animate-spin-slow h-3 w-3 rounded-full border-2 border-ink-400 border-t-transparent" />
            buscando…
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-300 bg-red-50 p-2.5 text-[12px] text-red-700">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 pt-3">
            <p className="text-[12px] text-ink-400">
              <strong className="text-ink-200">{results.length}</strong>{" "}
              {results.length === 1 ? "versión encontrada" : "versiones encontradas"}
              {results.length > visible && <span> · mostrando {visible}</span>}
            </p>
            {usdClp && (
              <p className="text-[11px] text-ink-400">
                Precio referencial TCGplayer · dólar ${usdClp.toLocaleString("es-CL")}
              </p>
            )}
          </div>

          <div className="mt-3 grid max-h-[520px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5">
            {results.slice(0, visible).map((card, i) => (
              <button
                key={`${card.externalId}-${i}`}
                type="button"
                onClick={() => onPick(card)}
                className="group flex flex-col overflow-hidden rounded-lg border border-ink-700 bg-white text-left transition hover:-translate-y-0.5 hover:border-carbon hover:shadow-md"
                title={`${card.name}${card.code ? ` — ${card.code}` : ""}`}
              >
                <span className="relative block aspect-[63/88] bg-ink-900">
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                  />
                  {card.rarity && (
                    <span className="absolute left-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold uppercase text-ink-300">
                      {card.rarity}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-carbon/0 text-[11px] font-bold text-white opacity-0 transition group-hover:bg-carbon/85 group-hover:opacity-100">
                    Seleccionar
                  </span>
                </span>

                <span className="flex flex-1 flex-col gap-0.5 p-2">
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink-200">
                    {card.name}
                  </span>

                  {card.code && (
                    <span className="w-fit rounded bg-ink-850 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-tight text-ink-300">
                      {card.code}
                    </span>
                  )}

                  <span className="line-clamp-1 text-[9px] text-ink-400">
                    {card.setName ?? ""}
                  </span>

                  {MYL_FORMATOS.filter((f) => card.extra?.includes(f)).map((f) => (
                    <span
                      key={f}
                      className="w-fit rounded bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold text-ink-300"
                    >
                      {f}
                    </span>
                  ))}

                  {(card.priceClp || card.priceClpFoil) && (
                    <span className="mt-auto block pt-1 text-[10px] leading-tight">
                      {card.priceClp && (
                        <span className="block font-semibold text-brand-600">
                          {clp(card.priceClp)}
                          <span className="font-normal text-ink-400">
                            {" "}
                            · US${card.priceUsd?.toFixed(2)}
                          </span>
                        </span>
                      )}
                      {card.priceClpFoil && (
                        <span className="block text-ink-400">
                          Foil {clp(card.priceClpFoil)}
                        </span>
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
              className="mt-3 w-full rounded-lg border border-ink-700 py-2 text-[12px] font-semibold text-ink-300 transition hover:border-carbon hover:text-carbon"
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
          <div className="mt-3 rounded-lg border border-ink-700 bg-ink-900 p-3">
            <p className="text-[12px] text-ink-400">
              {query.trim() ? (
                <>
                  Sin resultados para{" "}
                  <strong className="text-ink-200">“{query}”</strong>{" "}
                </>
              ) : (
                "Sin resultados con esos filtros "
              )}
              en {GAME_LIST.find((g) => g.id === game)?.short}.
            </p>

            {suggestions.length > 0 ? (
              <>
                <p className="mt-2 text-[12px] font-semibold text-ink-200">
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
                        className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-[12px] font-semibold text-ink-300 transition hover:border-carbon hover:text-carbon"
                      >
                        {s.sample && (
                          <Image
                            src={s.sample}
                            alt=""
                            width={22}
                            height={31}
                            className="rounded-sm object-cover"
                            unoptimized
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
              <p className="mt-1 text-[12px] text-ink-400">
                Revisa la ortografía o prueba con el nombre en inglés.
              </p>
            )}
          </div>
        )}
    </div>
  );
}
