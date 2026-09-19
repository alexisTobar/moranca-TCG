"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

export function SearchBox({ className = "" }: { className?: string }) {
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
      className={`group relative w-full max-w-xl ${className}`}
    >
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/50 transition group-focus-within:text-gold-300"
        strokeWidth={2}
      />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Busca una carta, mazo o sellado…"
        aria-label="Buscar publicaciones"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-white/15 bg-white/[0.08] pl-11 pr-24 text-[14px] text-white placeholder:text-white/45 outline-none backdrop-blur transition hover:bg-white/[0.12] focus:border-gold-400/70 focus:bg-white/[0.14] focus:shadow-[0_0_0_4px_rgba(230,185,74,0.18)]"
      />
      <button
        type="submit"
        className="btn btn-gold btn-sm absolute right-1.5 top-1/2 -translate-y-1/2 !rounded-full !px-4 !py-1.5"
      >
        Buscar
      </button>
    </form>
  );
}
