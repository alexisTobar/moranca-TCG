"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          rut: form.get("rut"),
          phone: form.get("phone"),
          address: form.get("address"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear tu cuenta");
      router.push(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Field name="name" label="Nombre completo" required autoComplete="name" />
      <Field name="email" label="Email" type="email" required autoComplete="email" />
      <Field
        name="password"
        label="Contraseña"
        type="password"
        required
        autoComplete="new-password"
        hint="Mínimo 10 caracteres, con mayúscula, minúscula y número."
      />
      <Field
        name="rut"
        label="RUT"
        required
        placeholder="12.345.678-9"
        autoComplete="off"
      />
      <Field
        name="phone"
        label="Teléfono"
        required
        placeholder="+56 9 1234 5678"
        autoComplete="tel"
      />
      <Field name="address" label="Dirección" required autoComplete="street-address" />

      {error && (
        <p className="rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-brand-600">
          {error}
        </p>
      )}

      <button
        disabled={loading}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
      >
        {loading ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
}) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      <div className="relative">
        <input
          name={name}
          type={isPassword ? (reveal ? "text" : "password") : type}
          required={required}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none transition focus:border-accent-500/70 focus:ring-2 focus:ring-accent-500/20 ${isPassword ? "pr-10" : ""}`}
        />
        {isPassword && (
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
        )}
      </div>
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}
