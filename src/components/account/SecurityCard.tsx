"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogOut, ShieldCheck } from "lucide-react";

/** Seguridad de la cuenta: cambiar contraseña y cerrar sesión en los demás dispositivos. */
export function SecurityCard({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionsMsg, setSessionsMsg] = useState<string | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cambiar la contraseña");
      setCurrent("");
      setNext("");
      setMsg({ ok: true, text: "Contraseña actualizada. Cerramos tu sesión en los demás dispositivos." });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function logoutOthers() {
    if (!confirm("¿Cerrar la sesión en todos los demás dispositivos?")) return;
    setSessionsBusy(true);
    setSessionsMsg(null);
    try {
      const res = await fetch("/api/account/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "No se pudo completar");
      setSessionsMsg("Listo: solo este navegador sigue con la sesión abierta.");
      router.refresh();
    } catch (err) {
      setSessionsMsg((err as Error).message);
    } finally {
      setSessionsBusy(false);
    }
  }

  return (
    <section className="rounded-2xl card-surface p-5">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-carbon">
        <ShieldCheck className="h-4 w-4 text-brand-600" strokeWidth={2} /> Seguridad
      </h2>
      <p className="mb-4 text-[12px] text-ink-400">Protege tu cuenta con una contraseña fuerte y revisa tus sesiones.</p>

      <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Contraseña actual</span>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className="input" />
        </label>
        <label className="block">
          <span className="field-label">Nueva contraseña</span>
          <div className="relative">
            <input
              type={reveal ? "text" : "password"}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
              className="input pr-10"
            />
            <button type="button" onClick={() => setReveal((v) => !v)} aria-label={reveal ? "Ocultar" : "Mostrar"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200">
              {reveal ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
            </button>
          </div>
          <span className="mt-1 block text-[11px] text-ink-400">Mínimo 10 caracteres, con mayúscula, minúscula y número.</span>
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button disabled={busy || !current || !next} className="btn btn-primary btn-sm">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Cambiar contraseña
          </button>
          {msg && <p className={`text-[12px] font-medium ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
        </div>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink-800 pt-4">
        <button type="button" onClick={logoutOthers} disabled={sessionsBusy} className="btn btn-secondary btn-sm">
          <LogOut className="h-4 w-4" strokeWidth={2} /> Cerrar sesión en otros dispositivos
        </button>
        {sessionsMsg && <p className="text-[12px] text-ink-400">{sessionsMsg}</p>}
      </div>

      {children}
    </section>
  );
}
