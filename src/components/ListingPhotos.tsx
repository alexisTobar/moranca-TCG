"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

export function ListingPhotos({ value, onChange, onBusyChange }: {
  value: string[];
  onChange: (urls: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: File[]) {
    if (busy.current || !files.length) return;
    setError(null);
    if (files.length + value.length > 10) {
      setError("Puedes adjuntar hasta 10 fotos. Quita alguna o selecciona menos archivos.");
      return;
    }
    busy.current = true;
    setUploading(true);
    onBusyChange(true);
    const urls = [...value];
    const failures: string[] = [];
    try {
      for (const file of files) {
        try {
          if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || !file.size || file.size > 4 * 1024 * 1024) {
            throw new Error("Usa JPG, PNG, WEBP o GIF de hasta 4 MB.");
          }
          const body = new FormData();
          body.append("file", file);
          const res = await fetch("/api/uploads", { method: "POST", body });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "No se pudo subir la foto.");
          urls.push(data.url);
        } catch (err) {
          failures.push(`${file.name}: ${(err as Error).message}`);
        }
      }
      onChange(urls);
      if (failures.length) setError(failures.join(" · "));
    } finally {
      busy.current = false;
      setUploading(false);
      onBusyChange(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <section className="card-surface rounded-2xl p-5" aria-labelledby="listing-photos-title" aria-busy={uploading}>
      <h3 id="listing-photos-title" className="text-sm font-semibold text-carbon">Fotos reales y adjuntos</h3>
      <p className="mt-1 text-xs text-ink-400">Agrega frente, reverso y detalles del producto. Se conservan junto a la imagen principal del catálogo. Hasta 10 fotos de 4 MB cada una.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {value.map((url, i) => (
          <div key={url} className="relative h-32 w-24 overflow-hidden rounded-lg border border-ink-700">
            <Image src={url} alt={`Foto adjunta ${i + 1}`} fill sizes="96px" className="object-contain" unoptimized />
            <button type="button" disabled={uploading} aria-label={`Quitar foto ${i + 1}`} onClick={() => onChange(value.filter((_, index) => index !== i))} className="absolute right-1 top-1 rounded-full bg-white p-2 text-carbon shadow-sm hover:bg-rose-100 disabled:opacity-50"><X size={16} /></button>
          </div>
        ))}
      </div>
      <button type="button" disabled={uploading || value.length >= 10} onClick={() => input.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); if (value.length < 10) void upload(Array.from(e.dataTransfer.files)); }}
        className="mt-4 flex min-h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-700 px-4 py-5 text-sm font-semibold text-carbon transition hover:border-brand-500 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50">
        {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        {uploading ? "Subiendo fotos…" : `Agregar o arrastrar fotos (${value.length}/10)`}
      </button>
      <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" aria-label="Seleccionar fotos del producto" onChange={e => void upload(Array.from(e.target.files ?? []))} />
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </section>
  );
}
