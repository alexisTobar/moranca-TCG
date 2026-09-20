"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { REGION_NAMES } from "@/lib/regions";
import { REGION_COOKIE } from "@/lib/location";

/**
 * Guarda la región del visitante en una cookie para marcar qué vendedores
 * están "cerca mío". No se envía a ningún servicio externo ni pide permisos.
 */
export function LocationPicker({
  region,
  className = "",
}: {
  region: string | null;
  className?: string;
}) {
  const router = useRouter();

  function change(value: string) {
    const maxAge = value ? 60 * 60 * 24 * 365 : 0;
    document.cookie = `${REGION_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
    router.refresh();
  }

  return (
    <label className={`relative inline-flex items-center ${className}`}>
      <MapPin
        className="pointer-events-none absolute left-3 h-4 w-4 text-brand-600"
        strokeWidth={2}
      />
      <select
        value={region ?? ""}
        onChange={(e) => change(e.target.value)}
        aria-label="Mi ubicación"
        className="input !w-auto !rounded-full !py-2 !pl-9 !pr-8 !text-[13px] font-semibold"
      >
        <option value="">¿Dónde estás? (para ver “cerca mío”)</option>
        {REGION_NAMES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
    </label>
  );
}
