"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usagePage } from "@/lib/usage-policy";
import { CONSENT_VERSION } from "@/lib/consent-policy";
import { ShieldCheck } from "lucide-react";

export function UsageConsent() {
  const pathname = usePathname();
  const [choice, setChoice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const last = useRef("");
  useEffect(() => {
    const saved = document.cookie.split("; ").find((s) => s.startsWith("wc_analytics="))?.split("=")[1];
    const version = document.cookie.split("; ").find((s) => s.startsWith("wc_consent_version="))?.split("=")[1];
    setChoice(version === CONSENT_VERSION && (saved === "yes" || saved === "no") ? saved : null);
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
  async function choose(value: "yes" | "no") {
    if (busy) return;
    setBusy(true); setError(""); setOpen(true);
    // Revocation is immediate, including when the server is unavailable.
    setChoice("no");
    document.cookie = `wc_analytics=no; Path=/; Max-Age=15552000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    try { sessionStorage.removeItem("wc_usage_session"); } catch {}
    last.current = "";
    try {
      const response = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accepted: value === "yes", version: CONSENT_VERSION }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No pudimos guardar tu decisión.");
      setChoice(data.accepted ? "yes" : "no"); setOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : "No pudimos guardar tu decisión."); setOpen(true); }
    finally { setBusy(false); }
  }
  if (!ready) return null;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-3 left-3 z-40 rounded-full border border-ink-700 bg-white px-3 py-2 text-xs text-ink-400 shadow-sm">Privacidad</button>
    {(choice === null || open) && <section aria-label="Preferencias de privacidad" aria-busy={busy} className="fixed bottom-4 left-4 right-4 z-[70] max-h-[80dvh] overflow-y-auto max-w-lg rounded-2xl border border-ink-700 bg-white p-5 shadow-2xl">
      <ShieldCheck className="mb-3 h-7 w-7 text-brand-600" aria-hidden="true" />
      <h2 className="font-display text-lg font-bold text-carbon">Tu privacidad, tu decisión</h2>
      <p className="mt-2 text-sm text-ink-400">Usamos almacenamiento esencial para tu sesión y carrito. Si aceptas, contamos visitas y términos buscados para mejorar la tienda, sin guardar tu nombre ni tu correo. Solo la administración ve estas estadísticas.</p>
      <Link href="/politica-de-cookies" className="mt-2 inline-block text-xs underline">Ver política de cookies y analítica</Link>
      <p className="mt-2 text-xs text-ink-400">Guardamos tu decisión, fecha y versión como respaldo. Si tienes sesión, el registro se vincula a tu cuenta. Puedes cambiarla cuando quieras.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {busy && <p role="status" className="mt-3 text-sm">Guardando tu preferencia…</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => choose("no")} className="btn btn-secondary btn-sm">Solo esenciales</button>
        <button type="button" disabled={busy} onClick={() => choose("yes")} className="btn btn-secondary btn-sm">Aceptar estadísticas</button>
        {choice !== null && <button type="button" disabled={busy} onClick={() => setOpen(false)} className="text-xs underline">Cerrar</button>}
      </div>
    </section>}
  </>;
}
