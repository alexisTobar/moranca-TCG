"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/cartas?q=${encodeURIComponent(q)}` : "/cartas");
      }}
      className="relative w-full max-w-xl"
    >
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Busca una carta, mazo o sellado…"
        aria-label="Buscar publicaciones"
        className="w-full rounded-lg border border-ink-700 bg-ink-900 py-2 pl-9 pr-20 text-sm text-ink-200 placeholder:text-ink-400 outline-none transition focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-bold text-paper transition hover:bg-brand-500"
      >
        Buscar
      </button>
    </form>
  );
}
