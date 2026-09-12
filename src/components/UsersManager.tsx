"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  slug: string;
  role: string;
  active: boolean;
  city: string | null;
  phone: string | null;
  bio: string | null;
  createdAt: Date | string;
  _count: { listings: number };
}

export function UsersManager({
  users,
  currentUserId,
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function createUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role: form.get("role"),
          city: form.get("city") || null,
          phone: form.get("phone") || null,
          bio: form.get("bio") || null,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear el perfil");
      setOk(`Perfil de ${data.user.name} creado.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "No se pudo actualizar");
      return;
    }
    router.refresh();
  }

  async function resetPassword(id: string, name: string) {
    const value = prompt(
      `Nueva contraseña para ${name}\n(mínimo 10 caracteres, con mayúscula, minúscula y número)`
    );
    if (!value) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: value }),
    });
    const data = await res.json().catch(() => ({}));
    alert(res.ok ? "Contraseña actualizada." : (data.error ?? "Error"));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-paper transition hover:bg-brand-500"
        >
          {open ? "Cancelar" : "+ Nuevo perfil"}
        </button>
        {ok && (
          <span className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1.5 text-[12px] text-emerald-700">
            {ok}
          </span>
        )}
      </div>

      {open && (
        <form onSubmit={createUser} className="rounded-2xl card-surface p-5">
          <h3 className="mb-4 text-sm font-semibold text-carbon">Crear perfil</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Nombre o tienda" required />
            <Field name="email" label="Email" type="email" required />
            <Field
              name="password"
              label="Contraseña"
              type="password"
              required
              hint="Mín. 10 caracteres, con mayúscula, minúscula y número"
            />
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Rol
              </span>
              <select
                name="role"
                defaultValue="SELLER"
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
              >
                <option value="SELLER">Vendedor</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </label>
            <Field name="city" label="Ciudad" />
            <Field name="phone" label="Teléfono" />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Descripción del perfil
              </span>
              <textarea
                name="bio"
                rows={2}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
              />
            </label>
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-[12px] text-rose-700">
              {error}
            </p>
          )}

          <button
            disabled={saving}
            className="mt-4 rounded-xl bg-brand-600 px-6 py-2.5 text-[13px] font-bold text-paper transition hover:bg-brand-500 disabled:opacity-60"
          >
            {saving ? "Creando…" : "Crear perfil"}
          </button>
        </form>
      )}

      <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-4 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-carbon font-display text-lg font-bold text-paper">
              {u.name.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[13px] font-semibold text-ink-200">
                  {u.name}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    u.role === "ADMIN"
                      ? "border-carbon bg-carbon text-paper"
                      : "border-ink-600 text-ink-400"
                  }`}
                >
                  {u.role === "ADMIN" ? "Admin" : "Vendedor"}
                </span>
                {!u.active && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-700">
                    Inactivo
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-ink-400">
                {u.email} · {u._count.listings} publicaciones
                {u.city ? ` · ${u.city}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              <button
                onClick={() => resetPassword(u.id, u.name)}
                className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-carbon"
              >
                Clave
              </button>
              {u.id !== currentUserId && (
                <>
                  <button
                    onClick={() => patch(u.id, { active: !u.active })}
                    className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-carbon"
                  >
                    {u.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() =>
                      patch(u.id, {
                        role: u.role === "ADMIN" ? "SELLER" : "ADMIN",
                      })
                    }
                    className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-carbon"
                  >
                    {u.role === "ADMIN" ? "Quitar admin" : "Hacer admin"}
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {label}
        {required && <span className="text-carbon"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete="off"
        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-200 outline-none focus:border-carbon"
      />
      {hint && <span className="mt-1 block text-[10px] text-ink-400">{hint}</span>}
    </label>
  );
}
