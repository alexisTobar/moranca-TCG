"use client";

import Image from "next/image";
import { useRef, useState } from "react";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Texto de ayuda según el tipo de publicación. */
  hint?: string;
}

export function ImageUploader({ value, onChange, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [urlManual, setUrlManual] = useState("");
  const [mostrarUrl, setMostrarUrl] = useState(false);

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen");
      onChange(data.url as string);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="rounded-2xl card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-carbon">Imagen</h3>
          <p className="mt-0.5 text-[12px] text-ink-400">
            {hint ??
              "Si la carta no aparece en el buscador, sube la foto tú mismo."}
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-[11px] font-semibold text-ink-400 transition hover:text-brand-600"
          >
            Quitar imagen
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        {/* Vista previa */}
        <div className="relative h-[150px] w-[107px] shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
          {value ? (
            <Image
              src={value}
              alt="Vista previa"
              fill
              sizes="107px"
              className="object-contain"
              unoptimized
            />
          ) : (
            <span className="flex h-full items-center justify-center text-3xl text-ink-600">
              🂠
            </span>
          )}
        </div>

        {/* Zona de carga */}
        <div className="min-w-[220px] flex-1">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              const file = e.dataTransfer.files?.[0];
              if (file) subir(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
              arrastrando
                ? "border-brand-500 bg-brand-500/10"
                : "border-ink-700 hover:border-brand-500 hover:bg-ink-900"
            }`}
          >
            <span className="text-2xl">{subiendo ? "⏳" : "📷"}</span>
            <span className="mt-2 text-[13px] font-semibold text-ink-200">
              {subiendo ? "Subiendo…" : "Arrastra la imagen o haz clic"}
            </span>
            <span className="mt-0.5 text-[11px] text-ink-400">
              JPG, PNG, WEBP o GIF · máximo 4 MB
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) subir(file);
            }}
          />

          <button
            type="button"
            onClick={() => setMostrarUrl((v) => !v)}
            className="mt-2 text-[11px] font-semibold text-ink-400 transition hover:text-brand-600"
          >
            {mostrarUrl ? "Ocultar" : "…o pegar una URL de internet"}
          </button>

          {mostrarUrl && (
            <div className="mt-2 flex gap-2">
              <input
                value={urlManual}
                onChange={(e) => setUrlManual(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-ink-700 bg-white px-3 py-2 text-[13px] text-ink-200 outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => {
                  const u = urlManual.trim();
                  if (!u) return;
                  if (!/^https?:\/\//i.test(u)) {
                    setError("La URL debe empezar con http:// o https://");
                    return;
                  }
                  setError(null);
                  onChange(u);
                }}
                className="shrink-0 rounded-lg border border-ink-700 px-3 py-2 text-[12px] font-semibold text-ink-300 transition hover:border-brand-500 hover:text-brand-600"
              >
                Usar
              </button>
            </div>
          )}

          {error && (
            <p className="mt-2 rounded-lg border border-red-300 bg-red-50 p-2 text-[12px] text-red-700">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
