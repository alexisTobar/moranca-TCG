"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";
import { GAME_LIST } from "@/lib/games";

export function MobileNav({
  nav,
  isLogged,
  accountHref = "/panel",
  accountLabel = "Mi panel",
  showLogout = false,
}: {
  nav: { href: string; label: string }[];
  isLogged: boolean;
  accountHref?: string;
  accountLabel?: string;
  showLogout?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // El panel se dibuja directamente en <body>. Si quedara dentro del header,
  // su `backdrop-filter` lo encierra: un elemento `fixed` dentro de un padre con
  // filtro se mide contra ese padre (68 px de alto) y no contra la pantalla.
  const menu = (
    <div
      className="animate-fade-up fixed inset-0 z-[100] flex flex-col bg-carbon xl:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Menú principal"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <span className="font-display text-sm font-bold uppercase tracking-widest text-gold-300">
          Menú
        </span>
        <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="icon-btn">
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-8 pt-3">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-2xl px-4 py-4 font-display text-xl font-semibold text-white transition hover:bg-white/10 active:bg-white/10"
          >
            {item.label}
            <ArrowRight className="h-5 w-5 text-white/40" strokeWidth={2} />
          </Link>
        ))}

        <p className="mt-6 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          Juegos
        </p>
        <div className="mt-2 flex flex-wrap gap-2 px-4">
          {GAME_LIST.map((g) => (
            <Link
              key={g.id}
              href={`/cartas?game=${g.id}`}
              onClick={() => setOpen(false)}
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-[13px] font-semibold text-white/85 transition hover:bg-white/15"
            >
              {g.short}
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-2 pt-8">
          <Link
            href={isLogged ? accountHref : "/ingresar"}
            onClick={() => setOpen(false)}
            className="btn btn-gold btn-lg w-full"
          >
            {isLogged ? accountLabel : "Ingresar"}
          </Link>
          {showLogout && (
            <LogoutButton className="w-full !border-white/20 !py-3 !text-white/80" />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="icon-btn xl:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={2} />
      </button>

      {open && mounted ? createPortal(menu, document.body) : null}
    </>
  );
}
