"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usagePage } from "@/lib/usage-policy";

export function UsageConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const last = useRef("");
  useEffect(() => {
    const saved = document.cookie.split("; ").find((s) => s.startsWith("wc_analytics="))?.split("=")[1];
    setChoice(saved === "yes" || saved === "no" ? saved : null);
    setReady(true);
  }, []);
  useEffect(() => {
    if (choice !== "yes" || navigator.doNotTrack === "1" || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return;
    const page = usagePage(pathname);
    if (!page || last.current === pathname) return;
    last.current = pathname;
    let session: string;
    try {
      session = sessionStorage.getItem("wc_usage_session") || crypto.randomUUID();
      sessionStorage.setItem("wc_usage_session", session);
    } catch { return; }
    void fetch("/api/usage", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ id: crypto.randomUUID(), session, page }),
    }).catch(() => {});
  }, [pathname, choice]);
  function choose(value: "yes" | "no") {
    document.cookie = `wc_analytics=${value}; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    if (value === "no") { try { sessionStorage.removeItem("wc_usage_session"); } catch {} }
    last.current = "";
    setChoice(value); setOpen(false);
  }
  if (!ready || pathname.startsWith("/panel")) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-40 rounded-full border border-ink-700 bg-white px-3 py-2 text-xs text-ink-400 shadow-sm">Privacidad</button>
    {(choice === null || open) && <section aria-label="Preferencias de privacidad" className="fixed bottom-4 left-4 right-4 z-[70] max-w-lg rounded-2xl border border-ink-700 bg-white p-5 shadow-2xl">
      <h2 className="font-display text-lg font-bold text-carbon">Tú eliges qué compartir</h2>
      <p className="mt-2 text-sm text-ink-400">Usamos almacenamiento esencial para tu sesión y carrito. Si aceptas, contamos visitas para mejorar la tienda, sin guardar tu nombre, correo ni búsquedas. Solo la administración ve estas estadísticas.</p>
      <Link href="/politica-de-cookies" className="mt-2 inline-block text-xs underline">Ver política de cookies y analítica</Link>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={() => choose("no")} className="btn btn-secondary btn-sm">Solo esenciales</button>
        <button type="button" onClick={() => choose("yes")} className="btn btn-secondary btn-sm">Aceptar estadísticas</button>
        {choice !== null && <button type="button" onClick={() => setOpen(false)} className="text-xs underline">Cerrar</button>}
      </div>
    </section>}
  </>;
}
