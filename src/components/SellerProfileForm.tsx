"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUploader } from "./ImageUploader";
import { REGIONS, comunasOf } from "@/lib/regions";

export interface SellerProfileValues {
  name: string;
  phone: string | null;
  address: string | null;
  rut: string | null;
  avatarUrl: string | null;
  city: string | null;
  region: string | null;
  offersShipping: boolean;
  offersPickup: boolean;
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
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [region, setRegion] = useState(initial.region ?? "");
  const [comuna, setComuna] = useState(initial.city ?? "");
  const [offersShipping, setOffersShipping] = useState(initial.offersShipping);
  const [offersPickup, setOffersPickup] = useState(initial.offersPickup);

  // La imagen ya queda subida al servidor apenas se elige (ImageUploader la
  // sube de inmediato), así que también guardamos la referencia en el perfil
  // al toque. Si esto quedara pendiente hasta el botón "Guardar cambios" del
  // formulario completo, alguien que suba su foto y no note ese botón se
  // queda con la foto huérfana: subida, pero nunca asociada a su perfil.
  async function handleAvatarChange(url: string | null) {
    setAvatarUrl(url);
    setSavingAvatar(true);
    setAvatarError(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la foto");
      router.refresh();
    } catch (err) {
      setAvatarError((err as Error).message);
    } finally {
      setSavingAvatar(false);
    }
  }

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
          region: region || null,
          city: comuna || null,
          offersShipping,
          offersPickup,
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
        onChange={handleAvatarChange}
        hint="Foto de perfil de tu tienda. Se muestra en tu perfil público y en tus reseñas."
      />
      {savingAvatar && <p className="-mt-3 text-[11px] text-ink-400">Guardando foto…</p>}
      {avatarError && <p className="-mt-3 text-[11px] text-brand-600">{avatarError}</p>}

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
        <h3 className="text-sm font-semibold text-carbon">Ubicación y entrega</h3>
        <p className="mt-0.5 text-[12px] text-ink-400">
          Los compradores de tu región te ven con la etiqueta “Cerca mío”, y pueden filtrar por la forma
          de entrega que ofreces.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Región</span>
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setComuna("");
              }}
              className="input"
            >
              <option value="">Selecciona tu región…</option>
              {REGIONS.map((r) => (
                <option key={r.code} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Comuna</span>
            <select
              value={comuna}
              onChange={(e) => setComuna(e.target.value)}
              disabled={!region}
              className="input disabled:opacity-50"
            >
              <option value="">{region ? "Selecciona tu comuna…" : "Elige una región primero"}</option>
              {comunasOf(region).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {[
            { label: "Envío a domicilio", hint: "Despacho por courier, por pagar", value: offersShipping, set: setOffersShipping },
            { label: "Retiro en persona", hint: "El comprador retira y paga en efectivo o transferencia", value: offersPickup, set: setOffersPickup },
          ].map((o) => (
            <label
              key={o.label}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3.5 transition ${
                o.value ? "border-brand-500 bg-brand-500/[0.04]" : "border-ink-800"
              }`}
            >
              <input
                type="checkbox"
                checked={o.value}
                onChange={(e) => o.set(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]"
              />
              <span>
                <span className="block text-[13px] font-bold text-carbon">{o.label}</span>
                <span className="block text-[11px] text-ink-400">{o.hint}</span>
              </span>
            </label>
          ))}
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
        className="btn btn-primary btn-sm"
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
