"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "./ImageUploader";

export interface SellerProfileValues {
  name: string;
  phone: string | null;
  address: string | null;
  rut: string | null;
  avatarUrl: string | null;
  bankName: string | null;
  bankAccountType: string | null;
  bankAccountNumber: string | null;
  bankHolderName: string | null;
  bankRut: string | null;
}

const ACCOUNT_TYPES = ["Cuenta Corriente", "Cuenta Vista", "Cuenta RUT", "Cuenta de Ahorro"];

export function SellerProfileForm({ initial }: { initial: SellerProfileValues }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
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
          avatarUrl,
          bankName: form.get("bankName") || undefined,
          bankAccountType: form.get("bankAccountType") || undefined,
          bankAccountNumber: form.get("bankAccountNumber") || undefined,
          bankHolderName: form.get("bankHolderName") || undefined,
          bankRut: form.get("bankRut") || undefined,
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
    <form onSubmit={onSubmit} className="space-y-6">
      <ImageUploader
        value={avatarUrl}
        onChange={setAvatarUrl}
        hint="Foto de perfil de tu tienda. Se muestra en tu perfil público y en tus reseñas."
      />

      <div className="rounded-2xl card-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-carbon">Mis datos</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Nombre completo" defaultValue={initial.name} required />
          <Field name="rut" label="RUT" defaultValue={initial.rut ?? ""} placeholder="12.345.678-9" />
          <Field name="phone" label="Teléfono" defaultValue={initial.phone ?? ""} />
          <Field
            name="address"
            label="Dirección"
            defaultValue={initial.address ?? ""}
          />
        </div>
      </div>

      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">Cuenta bancaria</h3>
        <p className="mt-0.5 text-[12px] text-ink-400">
          Es la cuenta a la que te van a transferir tus compradores. Se
          muestra en el checkout y en el chat de cada orden tuya.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="bankName" label="Banco" defaultValue={initial.bankName ?? ""} />
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Tipo de cuenta
            </span>
            <select
              name="bankAccountType"
              defaultValue={initial.bankAccountType ?? ""}
              className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
            >
              <option value="">—</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <Field
            name="bankAccountNumber"
            label="Número de cuenta"
            defaultValue={initial.bankAccountNumber ?? ""}
          />
          <Field
            name="bankRut"
            label="RUT del titular"
            defaultValue={initial.bankRut ?? ""}
            placeholder="12.345.678-9"
          />
          <Field
            name="bankHolderName"
            label="Nombre del titular"
            defaultValue={initial.bankHolderName ?? ""}
            className="sm:col-span-2"
          />
        </div>
      </div>

      {error && <p className="text-[12px] text-brand-600">{error}</p>}
      {saved && <p className="text-[12px] text-emerald-700">Guardado.</p>}
      <button
        disabled={saving}
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </button>
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
