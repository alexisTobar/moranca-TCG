"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoutButton } from "./LogoutButton";

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

      {open && (
        <div
          className="animate-fade-up fixed inset-0 z-[70] flex flex-col bg-carbon/95 backdrop-blur-2xl xl:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-display text-sm font-bold uppercase tracking-widest text-gold-300">
              Menú
            </span>
            <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="icon-btn">
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-8 pt-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-2xl px-4 py-4 font-display text-xl font-semibold text-white transition hover:bg-white/10"
              >
                {item.label}
                <ArrowRight className="h-5 w-5 text-white/40" strokeWidth={2} />
              </Link>
            ))}

            <div className="mt-auto space-y-2 pt-6">
              <Link
                href={isLogged ? accountHref : "/ingresar"}
                onClick={() => setOpen(false)}
                className="btn btn-gold btn-lg w-full"
              >
                {isLogged ? accountLabel : "Ingresar"}
              </Link>
              {showLogout && <LogoutButton className="w-full !py-3 !text-white/80 !border-white/20" />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
