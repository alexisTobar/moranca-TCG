"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star } from "lucide-react";
import { clp, timeAgo } from "@/lib/format";

export interface SellerStats {
  activeListings: number;
  sales30: number;
  orders30: number;
  salesTotal: number;
  rating: number | null;
  reviews: number;
  lastSaleAt: string | null;
}

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "vendiendo", label: "Vendiendo (30 días)" },
  { key: "sin-stock", label: "Sin publicaciones activas" },
  { key: "inactivos", label: "Desactivados" },
  { key: "admin", label: "Administradores" },
] as const;
const SORTS = [
  { key: "ventas", label: "Más ventas (30 días)" },
  { key: "total", label: "Más ventas (histórico)" },
  { key: "recientes", label: "Más recientes" },
  { key: "nombre", label: "Nombre" },
] as const;

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
  stats?: SellerStats;
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todos");
  const [sort, setSort] = useState<(typeof SORTS)[number]["key"]>("ventas");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = users.filter((u) => {
      if (q && ![u.name, u.email, u.city ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
      if (filter === "vendiendo") return (u.stats?.orders30 ?? 0) > 0;
      if (filter === "sin-stock") return u.active && (u.stats?.activeListings ?? 0) === 0;
      if (filter === "inactivos") return !u.active;
      if (filter === "admin") return u.role === "ADMIN";
      return true;
    });
    return list.sort((a, b) =>
      sort === "nombre" ? a.name.localeCompare(b.name, "es")
      : sort === "recientes" ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : sort === "total" ? (b.stats?.salesTotal ?? 0) - (a.stats?.salesTotal ?? 0)
      : (b.stats?.sales30 ?? 0) - (a.stats?.sales30 ?? 0));
  }, [users, query, filter, sort]);

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
          className="btn btn-primary btn-sm"
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
            className="btn btn-primary btn-sm mt-4"
          >
            {saving ? "Creando…" : "Crear perfil"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Buscar vendedor</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, correo o ciudad" className="w-full rounded-xl border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-brand-600" />
        </label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filtrar" className="rounded-xl border border-ink-700 bg-white px-3 py-2.5 text-[13px]">
          {FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar" className="rounded-xl border border-ink-700 bg-white px-3 py-2.5 text-[13px]">
          {SORTS.map((s) => <option key={s.key} value={s.key}>Ordenar: {s.label}</option>)}
        </select>
        <span className="text-[12px] text-ink-400">{visible.length} de {users.length}</span>
      </div>

      {visible.length === 0 && <p className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-[13px] text-ink-400">Ningún vendedor coincide con la búsqueda o el filtro.</p>}

      <ul className="divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
        {visible.map((u) => (
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
                {u.email}
                {u.city ? ` · ${u.city}` : ""} · desde {new Date(u.createdAt).toLocaleDateString("es-CL", { month: "short", year: "numeric" })}
              </p>
              {u.stats && <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                <div><dt className="inline text-ink-400">Activas </dt><dd className="inline font-semibold text-carbon">{u.stats.activeListings}<span className="font-normal text-ink-400"> / {u._count.listings}</span></dd></div>
                <div><dt className="inline text-ink-400">Ventas 30 d </dt><dd className="inline font-semibold text-carbon">{clp(u.stats.sales30)}<span className="font-normal text-ink-400"> ({u.stats.orders30})</span></dd></div>
                <div><dt className="inline text-ink-400">Histórico </dt><dd className="inline font-semibold text-carbon">{clp(u.stats.salesTotal)}</dd></div>
                <div><dt className="sr-only">Calificación</dt><dd className="inline-flex items-center gap-1 font-semibold text-carbon">{u.stats.rating != null ? <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />{u.stats.rating.toFixed(1)}<span className="font-normal text-ink-400">({u.stats.reviews})</span></> : <span className="font-normal text-ink-400">Sin reseñas</span>}</dd></div>
                <div><dt className="inline text-ink-400">Última venta </dt><dd className="inline text-carbon">{u.stats.lastSaleAt ? timeAgo(u.stats.lastSaleAt) : "nunca"}</dd></div>
              </dl>}
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
