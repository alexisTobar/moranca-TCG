"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

/** Segunda etapa del inicio de sesión: código de la app autenticadora o código de respaldo. */
export function TwoFactorLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Código incorrecto");
      router.push(next.startsWith("/") ? next : data.role === "BUYER" ? "/cuenta" : "/panel");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div className="flex justify-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
          <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
        </span>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">Código de verificación</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          required
          autoComplete="one-time-code"
          inputMode="text"
          placeholder="123456"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-center font-mono text-lg tracking-widest text-ink-200 outline-none transition focus:border-carbon"
        />
        <span className="mt-1.5 block text-[11px] text-ink-400">Abre tu app autenticadora. ¿Sin teléfono? Usa uno de tus códigos de respaldo (por ejemplo a1b2-c3d4).</span>
      </label>
      {error && <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">{error}</p>}
      <button disabled={busy || code.trim().length < 6} className="btn btn-primary btn-lg w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verificar e ingresar
      </button>
    </form>
  );
}
