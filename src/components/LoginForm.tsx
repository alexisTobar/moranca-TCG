"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/panel";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          remember: form.get("remember") === "on",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar sesión");
      router.push(next.startsWith("/") ? next : "/panel");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none transition focus:border-carbon"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-400">
          Contraseña
          <a
            href="/recuperar"
            className="text-[11px] font-semibold normal-case text-brand-600 hover:text-brand-700"
          >
            ¿Olvidaste tu clave?
          </a>
        </span>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 pr-10 text-sm text-ink-200 outline-none transition focus:border-carbon"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="remember"
          className="h-4 w-4 accent-[#1d4ed8]"
        />
        <span className="text-[12px] text-ink-300">Recordar sesión por 30 días</span>
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
        {loading ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
