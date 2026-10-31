import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

/** Encabezado común de las páginas del panel: etiqueta, título, descripción y acciones. */
export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: string; description?: React.ReactNode; actions?: React.ReactNode;
}) {
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <p className="text-[11px] font-bold uppercase tracking-widest text-brand-600">{eyebrow}</p>}
      <h1 className={`font-display text-3xl font-bold text-carbon ${eyebrow ? "mt-1.5" : ""}`}>{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-ink-400">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>;
}

/** Pestañas de filtro con contador. `tone="alert"` resalta la que requiere acción. */
export function FilterTabs({ tabs, active, label }: {
  tabs: Array<{ key: string; label: string; href: string; count?: number; tone?: "alert" }>; active: string; label: string;
}) {
  return <nav aria-label={label} className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
    {tabs.map((t) => <Link key={t.key} href={t.href} data-active={t.key === active} aria-current={t.key === active ? "page" : undefined} className="pill shrink-0">
      {t.label}
      {t.count !== undefined && <span className={t.tone === "alert" && t.count > 0 ? "ml-1 rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white" : "ml-1 opacity-60"}>{t.count}</span>}
    </Link>)}
  </nav>;
}

/** Buscador por GET: conserva los demás filtros como campos ocultos. */
export function SearchBox({ action, defaultValue, placeholder, keep = {} }: {
  action: string; defaultValue?: string; placeholder: string; keep?: Record<string, string | undefined>;
}) {
  return <form action={action} className="relative w-full sm:w-80" role="search">
    {Object.entries(keep).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
    <input name="q" defaultValue={defaultValue} placeholder={placeholder} aria-label={placeholder}
      className="w-full rounded-xl border border-ink-700 bg-white py-2.5 pl-9 pr-3 text-[13px] text-carbon outline-none transition focus:border-brand-600" />
  </form>;
}

/** Paginación simple con "Anterior / Siguiente" y el rango mostrado. */
export function Pager({ page, pages, total, take, href }: {
  page: number; pages: number; total: number; take: number; href: (page: number) => string;
}) {
  if (total === 0) return null;
  const from = (page - 1) * take + 1, to = Math.min(total, page * take);
  return <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-ink-400">
    <span>Mostrando {from}–{to} de {total.toLocaleString("es-CL")}</span>
    {pages > 1 && <div className="flex gap-1.5">
      {page > 1 ? <Link href={href(page - 1)} className="btn btn-secondary btn-sm"><ChevronLeft className="h-4 w-4" /> Anterior</Link> : null}
      {page < pages ? <Link href={href(page + 1)} className="btn btn-secondary btn-sm">Siguiente <ChevronRight className="h-4 w-4" /></Link> : null}
    </div>}
  </div>;
}

/** Estado vacío con ícono, título y explicación de qué hacer. */
export function EmptyState({ icon: Icon, title, text, action }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; text: string; action?: React.ReactNode;
}) {
  return <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-700 px-6 py-14 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-850 text-ink-500"><Icon className="h-7 w-7" strokeWidth={1.5} /></span>
    <p className="mt-4 font-display text-lg font-bold text-carbon">{title}</p>
    <p className="mt-1 max-w-md text-[13px] text-ink-400">{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
