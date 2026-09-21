import type { ReactNode } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-7 text-ink-300">{children}</p>;
}

export function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-3 text-[15px] leading-7 text-ink-300">
          <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** Pasos numerados (por ejemplo, el proceso de compra). */
export function Steps({ items }: { items: Array<{ title: string; text: ReactNode }> }) {
  return (
    <ol className="mt-4 space-y-3">
      {items.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-2xl card-surface p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-base font-bold text-white">
            {i + 1}
          </span>
          <div>
            <p className="font-display text-[15px] font-bold text-carbon">{s.title}</p>
            <p className="mt-0.5 text-[14px] leading-relaxed text-ink-400">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Note({
  children,
  title,
  tone = "info",
}: {
  children: ReactNode;
  title?: string;
  tone?: "info" | "warn";
}) {
  const warn = tone === "warn";
  const Icon = warn ? AlertTriangle : Info;
  return (
    <aside
      className={`mt-4 flex gap-3.5 rounded-2xl border p-4 sm:p-5 ${
        warn ? "border-amber-500/40 bg-amber-500/[0.07]" : "border-brand-500/25 bg-brand-500/[0.05]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          warn ? "bg-amber-500/15 text-amber-700" : "bg-brand-500/10 text-brand-600"
        }`}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 text-[14.5px] leading-relaxed text-ink-300">
        {title && <p className="mb-1 font-display text-[15px] font-bold text-carbon">{title}</p>}
        {children}
      </div>
    </aside>
  );
}

/** Tabla simple y responsive (se desplaza de lado en pantallas chicas). */
export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl card-surface">
      <table className="w-full min-w-[520px] text-left text-[13.5px]">
        <thead>
          <tr className="border-b border-ink-800 text-[11.5px] uppercase tracking-wider text-ink-400">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-800">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="px-4 py-3 font-semibold text-carbon">
                    {c}
                  </th>
                ) : (
                  <td key={j} className="px-4 py-3 leading-relaxed text-ink-300">
                    {c}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-carbon">{children}</strong>;
}
