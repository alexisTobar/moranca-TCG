"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountProfileForm({
  name,
  phone,
  address,
  rut,
}: {
  name: string;
  phone: string | null;
  address: string | null;
  rut: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          phone: form.get("phone"),
          address: form.get("address"),
          rut: form.get("rut"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field name="name" label="Nombre completo" defaultValue={name} required />
      <Field name="rut" label="RUT" defaultValue={rut ?? ""} placeholder="12.345.678-9" />
      <Field name="phone" label="Teléfono" defaultValue={phone ?? ""} />
      <Field name="address" label="Dirección" defaultValue={address ?? ""} className="sm:col-span-2" />

      <div className="sm:col-span-2">
        {error && <p className="mb-2 text-[12px] text-brand-600">{error}</p>}
        {saved && <p className="mb-2 text-[12px] text-emerald-700">Guardado.</p>}
        <button
          disabled={saving}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
      />
    </label>
  );
}
