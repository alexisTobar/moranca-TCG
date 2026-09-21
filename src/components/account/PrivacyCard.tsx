"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Trash2 } from "lucide-react";

/** Tus datos: descargar una copia y eliminar la cuenta (derechos de acceso y supresión). */
export function PrivacyCard({ canDelete = true }: { canDelete?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar la cuenta");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl card-surface p-5">
      <h2 className="mb-1 text-sm font-semibold text-carbon">Mis datos</h2>
      <p className="mb-4 text-[12px] text-ink-400">Puedes llevarte una copia de tu información o eliminar tu cuenta cuando quieras.</p>

      <div className="flex flex-wrap items-center gap-3">
        <a href="/api/account/export" download className="btn btn-secondary btn-sm">
          <Download className="h-4 w-4" strokeWidth={2} /> Descargar mis datos
        </a>
        {canDelete && !open && (
          <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary btn-sm !text-rose-700">
            <Trash2 className="h-4 w-4" strokeWidth={2} /> Eliminar mi cuenta
          </button>
        )}
      </div>

      {canDelete && open && (
        <form onSubmit={remove} className="mt-4 space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] p-4">
          <p className="text-[13px] leading-relaxed text-ink-300">
            Se borrarán tus datos personales y dejarás de poder ingresar. Tus publicaciones se pausan y tu tienda se elimina.
            <strong className="text-carbon"> No se puede deshacer.</strong> Necesitas no tener órdenes en curso. Si entraste con Google, primero define una contraseña con “Olvidé mi contraseña”.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-ink-400">Tu contraseña</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="input !w-52 !py-2 text-[13px]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold text-ink-400">Escribe ELIMINAR</span>
              <input value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="input !w-40 !py-2 text-[13px]" />
            </label>
            <button disabled={busy || confirm !== "ELIMINAR" || !password} className="btn btn-primary btn-sm">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Eliminar definitivamente
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="btn btn-secondary btn-sm">Cancelar</button>
          </div>
          {error && <p className="text-[12px] font-medium text-rose-700">{error}</p>}
        </form>
      )}
    </section>
  );
}
