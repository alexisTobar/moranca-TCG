"use client";

import { useState } from "react";

export function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo procesar la solicitud");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="mt-6 rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-3 text-[13px] text-emerald-700">
        Si el email está registrado, te llegará un link para elegir una
        contraseña nueva. Revisa también spam.
      </p>
    );
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

      {error && (
        <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
          {error}
        </p>
      )}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Mandar link de recuperación"}
      </button>
    </form>
  );
}
