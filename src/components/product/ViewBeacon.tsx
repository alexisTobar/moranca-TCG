"use client";

import { useEffect } from "react";

/** Avisa una vista de la publicación al abrir la ficha (la página puede venir de caché). */
export function ViewBeacon({ listingId }: { listingId: string }) {
  useEffect(() => {
    const url = `/api/listings/${encodeURIComponent(listingId)}/view`;
    if (!navigator.sendBeacon?.(url)) void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
  }, [listingId]);
  return null;
}
