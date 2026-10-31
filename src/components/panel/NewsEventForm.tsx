"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";

const field = "mt-1 w-full rounded-xl border border-ink-700 bg-white px-3 py-2.5 text-[14px] font-normal text-carbon outline-none focus:border-brand-600";
const GAMES = [
  { value: "GENERAL", label: "Varios juegos / comunidad" },
  { value: "POKEMON", label: "Pokémon" },
  { value: "ONEPIECE", label: "One Piece" },
  { value: "MAGIC", label: "Magic" },
  { value: "MYL", label: "Mitos y Leyendas" },
];

/** Formulario para sumar un evento de Chile a la agenda pública de noticias. */
export function NewsEventForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el evento");
      toast.success("Evento publicado en la agenda");
      form.reset();
      setImage(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el evento");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-4 rounded-2xl card-surface p-5 sm:grid-cols-2">
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Nombre del evento<input name="title" required minLength={4} maxLength={120} placeholder="Ej.: Día de las Cartas en Tienda X" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon">Fecha<input name="date" type="date" required min={today} defaultValue={today} className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon">Juego<select name="category" defaultValue="GENERAL" className={field}>{GAMES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
    <label className="text-[13px] font-semibold text-carbon">Ciudad<input name="city" required minLength={2} maxLength={60} placeholder="Santiago" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon">Lugar (opcional)<input name="place" maxLength={100} placeholder="Tienda, centro de eventos o dirección" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Descripción (opcional)<textarea name="description" maxLength={400} rows={3} placeholder="Horario, valor de entrada, formato del torneo, premios…" className={field} /></label>
    <label className="text-[13px] font-semibold text-carbon sm:col-span-2">Enlace del organizador (opcional)<input name="link" type="url" maxLength={500} placeholder="https://" className={field} /></label>
    <div className="sm:col-span-2"><ImageUploader value={image} onChange={setImage} onBusyChange={setUploading} title="Afiche o foto (opcional)" hint="Se muestra en la agenda y en la ficha del evento." shape="wide" allowUrl={false} /><input type="hidden" name="imageUrl" value={image ?? ""} /></div>
    <div className="sm:col-span-2"><button type="submit" disabled={busy || uploading} className="btn btn-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Publicar evento</button></div>
  </form>;
}

export function DeleteNewsEvent({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm("¿Quitar este evento de la agenda?")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/news?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast.error("No se pudo quitar el evento");
    toast.success("Evento quitado");
    router.refresh();
  }
  return <button type="button" onClick={remove} disabled={busy} className="btn btn-secondary btn-sm"><Trash2 className="h-4 w-4" /> Quitar</button>;
}
