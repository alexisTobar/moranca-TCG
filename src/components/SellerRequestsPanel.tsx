"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SellerRequestRow {
  id: string;
  name: string;
  email: string;
  sellerRequestMessage: string | null;
  sellerRequestAt: Date | string | null;
}

export function SellerRequestsPanel({ requests }: { requests: SellerRequestRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerRequestStatus: status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "No se pudo procesar la solicitud");
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="rounded-2xl border border-carbon bg-carbon/5 p-5">
      <h2 className="text-sm font-semibold text-carbon">
        Solicitudes de vendedor ({requests.length})
      </h2>
      <ul className="mt-3 space-y-2.5">
        {requests.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-700 bg-white p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink-200">{r.name}</p>
              <p className="text-[11px] text-ink-400">{r.email}</p>
              {r.sellerRequestMessage && (
                <p className="mt-1 text-[12px] text-ink-300">
                  “{r.sellerRequestMessage}”
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                disabled={busyId === r.id}
                onClick={() => review(r.id, "APPROVED")}
                className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-500/20 disabled:opacity-50"
              >
                Aprobar
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => review(r.id, "REJECTED")}
                className="rounded-lg border border-ink-700 px-3 py-1.5 text-[11px] font-semibold text-ink-300 transition hover:text-brand-600 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
