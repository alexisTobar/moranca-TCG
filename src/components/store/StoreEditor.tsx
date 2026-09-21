"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ImageOff } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { ACCENT_PRESETS, isHexColor, storeThemeVars } from "@/lib/store-theme";
import { clp } from "@/lib/format";

export interface StoreValues {
  displayName: string;
  tagline: string;
  about: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  accentColor: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  website: string;
  announcement: string;
  featuredListingIds: string[];
}

export interface FeaturableListing {
  id: string;
  title: string;
  imageUrl: string | null;
  price: number;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  max,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={max} className="input" />
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

/** Editor de la tienda: lo usa cada vendedor desde su propio panel. */
export function StoreEditor({
  initial,
  listings,
  maxFeatured,
  fallbackName,
}: {
  initial: StoreValues;
  listings: FeaturableListing[];
  maxFeatured: number;
  fallbackName: string;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof StoreValues>(key: K, value: StoreValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function toggleFeatured(id: string) {
    const has = v.featuredListingIds.includes(id);
    if (!has && v.featuredListingIds.length >= maxFeatured) return;
    set("featuredListingIds", has ? v.featuredListingIds.filter((x) => x !== id) : [...v.featuredListingIds, id]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: v.displayName,
          tagline: v.tagline,
          about: v.about,
          logoUrl: v.logoUrl,
          bannerUrl: v.bannerUrl,
          accentColor: v.accentColor,
          instagram: v.instagram,
          facebook: v.facebook,
          whatsapp: v.whatsapp,
          website: v.website,
          announcement: v.announcement,
          featuredListingIds: v.featuredListingIds,
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

  const theme = storeThemeVars(v.accentColor) as React.CSSProperties;
  const accent = isHexColor(v.accentColor) ? v.accentColor : "#c22443";

  return (
    <form onSubmit={save} className="space-y-5">
      {/* Vista previa */}
      <div className="overflow-hidden rounded-2xl card-surface" style={theme}>
        <div
          className="relative h-28 bg-cover bg-center sm:h-36"
          style={{
            backgroundImage: v.bannerUrl ? `url(${v.bannerUrl})` : `linear-gradient(135deg, ${accent}, #0b0f1a)`,
          }}
        />
        <div className="flex items-end gap-4 px-5 pb-5">
          <span className="-mt-9 flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
            {v.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="h-6 w-6 text-ink-500" strokeWidth={1.5} />
            )}
          </span>
          <div className="min-w-0 flex-1 pt-3">
            <p className="flex items-center gap-1.5 font-display text-lg font-bold text-carbon">
              {v.displayName || fallbackName}
              <BadgeCheck className="h-4.5 w-4.5 text-brand-600" strokeWidth={2} />
            </p>
            <p className="truncate text-[12px] text-ink-400">{v.tagline || "Tu eslogan aparece aquí"}</p>
          </div>
          <span className="btn btn-primary btn-sm pointer-events-none">Botón</span>
        </div>
        <p className="border-t border-ink-800 bg-ink-900 px-5 py-2 text-[11px] text-ink-400">
          Así se verá la parte de arriba de tu tienda.
        </p>
      </div>

      {/* Identidad */}
      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">Identidad</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la tienda" value={v.displayName} onChange={(x) => set("displayName", x)} placeholder={fallbackName} max={60} />
          <Field label="Eslogan" value={v.tagline} onChange={(x) => set("tagline", x)} placeholder="Singles y sellados de Pokémon" max={120} />
        </div>
        <label className="mt-4 block">
          <span className="field-label">Sobre tu tienda</span>
          <textarea
            value={v.about}
            onChange={(e) => set("about", e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Cuenta quién eres, qué vendes, cómo coordinas entregas…"
            className="input"
          />
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ImageUploader
          value={v.logoUrl}
          onChange={(u) => set("logoUrl", u)}
          title="Logo"
          shape="square"
          allowUrl={false}
          hint="Cuadrado, se ve mejor entre 400 y 800 px. También va al centro de tu QR."
        />
        <ImageUploader
          value={v.bannerUrl}
          onChange={(u) => set("bannerUrl", u)}
          title="Banner"
          shape="wide"
          allowUrl={false}
          hint="Imagen ancha (ej. 1600 x 500 px) para la parte de arriba de tu tienda."
        />
      </div>

      {/* Color */}
      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">Color de tu tienda</h3>
        <p className="mt-0.5 text-[12px] text-ink-400">Pinta botones, enlaces y precios de tu tienda.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={c.name}
              onClick={() => set("accentColor", c.value)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ring-offset-2 transition ${
                v.accentColor.toLowerCase() === c.value ? "ring-carbon" : "ring-transparent hover:ring-ink-600"
              }`}
              style={{ backgroundColor: c.value }}
            >
              {v.accentColor.toLowerCase() === c.value && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-2 text-[12px] font-semibold text-ink-300">
            Otro
            <input
              type="color"
              value={accent}
              onChange={(e) => set("accentColor", e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-ink-700 bg-white p-0.5"
            />
          </label>
        </div>
      </div>

      {/* Contacto y redes */}
      <div className="rounded-2xl card-surface p-5">
        <h3 className="text-sm font-semibold text-carbon">Redes y contacto</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Instagram" value={v.instagram} onChange={(x) => set("instagram", x)} placeholder="@mitienda" max={200} />
          <Field label="Facebook" value={v.facebook} onChange={(x) => set("facebook", x)} placeholder="mitienda" max={200} />
          <Field label="WhatsApp" value={v.whatsapp} onChange={(x) => set("whatsapp", x)} placeholder="+56 9 1234 5678" max={40} hint="Con este número los compradores te escriben con un toque." />
          <Field label="Sitio web" value={v.website} onChange={(x) => set("website", x)} placeholder="https://mitienda.cl" max={200} />
        </div>
        <div className="mt-4">
          <Field
            label="Anuncio (barra de arriba)"
            value={v.announcement}
            onChange={(x) => set("announcement", x)}
            placeholder="Envíos gratis sobre $30.000 este fin de semana"
            max={160}
            hint="Déjalo vacío si no quieres mostrar ninguno."
          />
        </div>
      </div>

      {/* Destacados */}
      <div className="rounded-2xl card-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-carbon">Productos destacados</h3>
          <span className="text-[12px] font-semibold text-ink-400">
            {v.featuredListingIds.length} de {maxFeatured}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-ink-400">Aparecen primero, arriba de todo tu catálogo.</p>
        {listings.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ink-900 p-4 text-[13px] text-ink-400">
            Publica productos para poder destacarlos.
          </p>
        ) : (
          <ul className="mt-4 grid max-h-[26rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {listings.map((l) => {
              const on = v.featuredListingIds.includes(l.id);
              const blocked = !on && v.featuredListingIds.length >= maxFeatured;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    disabled={blocked}
                    onClick={() => toggleFeatured(l.id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? "border-brand-500 bg-brand-500/[0.04]" : "border-ink-800 hover:border-ink-600"
                    }`}
                  >
                    <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-ink-850">
                      {l.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[12px] font-semibold text-carbon">{l.title}</span>
                      <span className="text-[11px] text-ink-400">{clp(l.price)}</span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        on ? "border-brand-600 bg-brand-600 text-white" : "border-ink-600"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-[13px] text-rose-700">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button disabled={saving} className="btn btn-primary btn-lg">
          {saving ? "Guardando…" : "Guardar mi tienda"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-emerald-700">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Guardado
          </span>
        )}
      </div>
    </form>
  );
}
