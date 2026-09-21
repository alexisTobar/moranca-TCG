"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

/** Botón "Compartir" que despliega el link y el QR (recibidos como contenido). */
export function ShareToggle({ children, label = "Compartir" }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn btn-secondary btn-sm"
      >
        <Share2 className="h-4 w-4" strokeWidth={2} />
        {label}
      </button>
      {open && <div className="animate-fade-up mt-3 max-w-xl">{children}</div>}
    </div>
  );
}
