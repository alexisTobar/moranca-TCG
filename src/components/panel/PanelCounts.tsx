"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CheckCheck, CreditCard, Flag, LifeBuoy, Package, UserPlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Counts {
  subscriptions: number;
  tickets: number;
  sellerRequests: number;
  reports: number;
  orders: number;
}

const POLL_MS = 30_000;

const Ctx = createContext<{ counts: Counts; refresh: () => void }>({
  counts: { subscriptions: 0, tickets: 0, sellerRequests: 0, reports: 0, orders: 0 },
  refresh: () => {},
});

export const usePanelCounts = () => useContext(Ctx);

/** Mantiene al día los avisos del panel: al entrar, cada 30 s, al volver a la pestaña y en cada navegación. */
export function PanelCountsProvider({ initial, children }: { initial: Counts; children: React.ReactNode }) {
  const [counts, setCounts] = useState<Counts>(initial);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/panel/counts", { cache: "no-store" });
      if (res.ok) setCounts((await res.json()) as Counts);
    } catch {
      /* sin red: se reintenta en el siguiente ciclo */
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  return <Ctx.Provider value={{ counts, refresh }}>{children}</Ctx.Provider>;
}

/** Numerito rojo para el menú. No pinta nada si es 0. */
export function CountBadge({ value, className = "" }: { value: number; className?: string }) {
  if (value <= 0) return null;
  return (
    <span
      className={`inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white ${className}`}
      aria-label={`${value} pendientes`}
    >
      {value > 99 ? "99+" : value}
    </span>
  );
}

interface Entry {
  href: string;
  icon: LucideIcon;
  text: string;
}

/** Campana de notificaciones del encabezado: lista lo que espera una acción y lleva directo a ello. */
export function PanelBell({ isAdmin }: { isAdmin: boolean }) {
  const { counts } = usePanelCounts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const entries: Entry[] = [];
  if (counts.subscriptions > 0)
    entries.push({
      href: "/panel/tiendas",
      icon: CreditCard,
      text: `${plural(counts.subscriptions, "pago de membresía", "pagos de membresía")} por revisar`,
    });
  if (counts.tickets > 0)
    entries.push({
      href: "/panel/soporte",
      icon: LifeBuoy,
      text: isAdmin
        ? `${plural(counts.tickets, "ticket con mensaje nuevo", "tickets con mensajes nuevos")}`
        : `${plural(counts.tickets, "respuesta", "respuestas")} de soporte sin leer`,
    });
  if (counts.sellerRequests > 0)
    entries.push({
      href: "/panel/usuarios",
      icon: UserPlus,
      text: `${plural(counts.sellerRequests, "solicitud", "solicitudes")} para ser vendedor`,
    });
  if (counts.reports > 0)
    entries.push({
      href: "/panel/reportes",
      icon: Flag,
      text: `${plural(counts.reports, "reporte", "reportes")} por revisar`,
    });
  if (counts.orders > 0)
    entries.push({
      href: "/panel/ordenes",
      icon: Package,
      text: `${plural(counts.orders, "orden", "órdenes")} con comprobante por confirmar`,
    });
  const total = counts.subscriptions + counts.tickets + counts.sellerRequests + counts.reports + counts.orders;

  return (
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        aria-label={total > 0 ? `Notificaciones: ${total} pendientes` : "Notificaciones"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {total > 0 && <CountBadge value={total} className="absolute -right-1 -top-1 ring-2 ring-carbon" />}
      </button>

      {open && (
        <div className="animate-fade-up absolute inset-x-4 top-full z-[60] mt-1 overflow-hidden sm:inset-x-auto sm:right-0 sm:top-12 sm:mt-0 sm:w-[22rem] rounded-2xl border border-ink-700 bg-white text-carbon shadow-2xl">
          <p className="border-b border-ink-800 px-4 py-3 font-display text-sm font-bold">Notificaciones</p>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCheck className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="text-[13px] font-semibold">Todo al día</p>
              <p className="text-[12px] text-ink-400">No tienes nada pendiente por ahora.</p>
            </div>
          ) : (
            <ul>
              {entries.map((e) => (
                <li key={e.href}>
                  <Link
                    href={e.href}
                    className="flex items-center gap-3 px-4 py-3 text-[13px] font-medium transition hover:bg-ink-850"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                      <e.icon className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">{e.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
