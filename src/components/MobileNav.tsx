"use client";

import Link from "next/link";
import { useState } from "react";

export function MobileNav({
  nav,
  isLogged,
}: {
  nav: { href: string; label: string }[];
  isLogged: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menú"
        aria-expanded={open}
        className="rounded-lg border border-ink-700 p-2 text-ink-200 xl:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-ink-800 bg-ink-950/98 p-4 backdrop-blur-xl xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-200 hover:bg-ink-850"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={isLogged ? "/panel" : "/ingresar"}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-bold text-paper"
            >
              {isLogged ? "Mi panel" : "Ingresar"}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
