"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <button
      onClick={async () => {
        setLoading(true);
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      disabled={loading}
      className="rounded-lg border border-ink-700 px-3 py-1.5 text-[12px] font-semibold text-ink-300 transition hover:border-rose-500/50 hover:text-brand-600 disabled:opacity-60"
    >
      {loading ? "Saliendo…" : "Salir"}
    </button>
  );
}
