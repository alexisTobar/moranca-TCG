"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

/**
 * Filtros del catálogo: siempre visibles en escritorio y plegables en móvil,
 * para que en el teléfono los resultados queden arriba y no detrás de un
 * bloque enorme de filtros.
 */
export function FilterDrawer({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="h-fit lg:sticky lg:top-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="btn btn-secondary w-full lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
        {open ? "Ocultar filtros" : "Filtros"}
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <aside
        className={`${open ? "block" : "hidden"} mt-3 space-y-6 rounded-3xl card-surface p-5 lg:mt-0 lg:block`}
      >
        {children}
      </aside>
    </div>
  );
}
