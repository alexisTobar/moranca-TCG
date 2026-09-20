"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ImageOff, Search, SearchX, X } from "lucide-react";
import { GAMES, isGameId } from "@/lib/games";
import { clp } from "@/lib/format";

interface Suggestion {
  slug: string;
  title: string;
  game: string;
  type: string;
  imageUrl: string | null;
  price: number;
  stock: number;
  setName: string | null;
  condition: string | null;
  isFoil: boolean;
}

const TYPE_LABEL: Record<string, string> = { SINGLE: "Single", SEALED: "Sellado", DECK: "Mazo" };

/**
 * Buscador global del sitio. Mientras se escribe muestra, debajo del campo,
 * una lista con las publicaciones que coinciden (foto, nombre, edición y
 * precio) para ir directo a la carta sin pasar por el catálogo.
 */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const listId = useId();
  const wrapRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [value, setValue] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState<string>("");
  const [active, setActive] = useState(-1);

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  // Busca con un pequeño retraso para no consultar en cada tecla.
  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) {
      abortRef.current?.abort();
      setResults([]);
      setTotal(0);
      setSearched("");
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setSearched(term);
        setActive(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setSearched(term);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [value]);

  // Cierra la lista al hacer clic fuera del buscador.
  useEffect(() => {
    function onDown(e: MouseEvent | TouchEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, []);

  function goSearch() {
    const q = value.trim();
    setOpen(false);
    inputRef.current?.blur();
    router.push(q ? `/cartas?q=${encodeURIComponent(q)}` : "/cartas");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  const term = value.trim();
  const showPanel = open && term.length >= 2;
  const isFresh = searched === term;

  return (
    <form
      ref={wrapRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && results[active]) {
          setOpen(false);
          router.push(`/producto/${results[active].slug}`);
        } else {
          goSearch();
        }
      }}
      className={`group relative w-full max-w-xl ${className}`}
    >
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/50 transition group-focus-within:text-gold-300"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Busca una carta, mazo o sellado…"
        aria-label="Buscar publicaciones"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-white/15 bg-white/[0.08] pl-11 pr-28 text-[14px] text-white placeholder:text-white/45 outline-none backdrop-blur transition hover:bg-white/[0.12] focus:border-gold-400/70 focus:bg-white/[0.14] focus:shadow-[0_0_0_4px_rgba(230,185,74,0.18)]"
      />

      <span className="absolute right-[5.25rem] top-1/2 flex -translate-y-1/2 items-center">
        {loading ? (
          <span className="animate-spin-slow h-4 w-4 rounded-full border-2 border-gold-300 border-t-transparent" />
        ) : (
          value && (
            <button
              type="button"
              aria-label="Borrar búsqueda"
              onClick={() => {
                setValue("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )
        )}
      </span>

      <button
        type="submit"
        className="btn btn-gold btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 !rounded-full !px-4 !py-1.5"
      >
        Buscar
      </button>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-2xl border border-ink-800 bg-white text-ink-200 shadow-[0_24px_60px_-20px_rgba(8,11,22,0.55)]"
        >
          {results.length > 0 && (
            <ul className="max-h-[min(60vh,26rem)] divide-y divide-ink-850 overflow-y-auto">
              {results.map((r, i) => {
                const game = isGameId(r.game) ? GAMES[r.game].short : r.game;
                return (
                  <li key={r.slug} role="option" aria-selected={active === i}>
                    <Link
                      href={`/producto/${r.slug}`}
                      onClick={() => setOpen(false)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex items-center gap-3 px-3 py-2.5 transition ${
                        active === i ? "bg-ink-900" : "hover:bg-ink-900"
                      }`}
                    >
                      <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-ink-850 ring-1 ring-black/5">
                        {r.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.imageUrl}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-ink-500">
                            <ImageOff className="h-4 w-4" strokeWidth={1.5} />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-carbon">
                          {r.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-400">
                          {game} · {TYPE_LABEL[r.type] ?? r.type}
                          {r.setName ? ` · ${r.setName}` : ""}
                          {r.condition ? ` · ${r.condition}` : ""}
                          {r.isFoil ? " · Foil" : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-[14px] font-bold text-carbon">
                          {clp(r.price)}
                        </span>
                        {r.stock <= 0 && (
                          <span className="block text-[10px] font-semibold uppercase text-ink-500">
                            Agotado
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {results.length === 0 && isFresh && !loading && (
            <div className="flex flex-col items-center px-4 py-7 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-850 text-ink-500">
                <SearchX className="h-5 w-5" strokeWidth={1.5} />
              </span>
              <p className="mt-3 text-[13px] font-semibold text-carbon">
                Sin resultados para “{term}”
              </p>
              <p className="mt-0.5 text-[12px] text-ink-400">
                Revisa la ortografía o prueba con otro nombre.
              </p>
            </div>
          )}

          {results.length === 0 && !isFresh && (
            <div className="px-4 py-6 text-center text-[12px] text-ink-400">Buscando…</div>
          )}

          {(results.length > 0 || (isFresh && !loading)) && (
            <button
              type="button"
              onClick={goSearch}
              className="flex w-full items-center justify-between gap-2 border-t border-ink-800 bg-ink-900 px-4 py-3 text-[12px] font-bold text-brand-600 transition hover:bg-ink-850"
            >
              <span className="truncate">
                {total > results.length
                  ? `Ver los ${total} resultados de “${term}”`
                  : `Ver “${term}” en el catálogo`}
              </span>
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}
    </form>
  );
}
