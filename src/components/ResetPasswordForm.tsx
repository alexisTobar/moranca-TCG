"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.get("password") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo cambiar tu contraseña");
      setDone(true);
      setTimeout(() => router.push("/ingresar"), 1800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="mt-6 rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-3 text-[13px] text-emerald-700">
        Contraseña actualizada. Redirigiendo a Ingresar…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Contraseña nueva
        </span>
        <div className="relative">
          <input
            name="password"
            type={reveal ? "text" : "password"}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 pr-10 text-sm text-ink-200 outline-none transition focus:border-carbon"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200"
          >
            {reveal ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <span className="mt-1 block text-[11px] text-ink-400">
          Mínimo 10 caracteres, con mayúscula, minúscula y número.
        </span>
      </label>

      {error && (
        <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
          {error}
        </p>
      )}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
      >
        {loading ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
