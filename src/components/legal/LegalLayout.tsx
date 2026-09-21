import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronDown, FileText, Mail } from "lucide-react";
import { CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_LINKS, LEGAL_UPDATED } from "@/lib/legal";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Estructura común de las páginas legales: cabecera, índice lateral fijo (desplegable en móvil),
 * secciones numeradas con ancla, bloque de contacto y enlaces a los demás documentos.
 */
export function LegalLayout({
  eyebrow,
  title,
  intro,
  summary,
  sections,
  current,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /** Recuadro "En resumen" que va antes de las secciones. */
  summary?: ReactNode;
  sections: LegalSection[];
  current: string;
}) {
  const toc = (
    <ol className="space-y-0.5 text-[13px]">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="flex gap-2.5 rounded-lg px-2.5 py-1.5 font-medium text-ink-400 transition hover:bg-ink-850 hover:text-brand-700"
          >
            <span className="w-5 shrink-0 text-ink-500">{i + 1}.</span>
            <span>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 lg:pb-16 lg:pt-16">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">
            <FileText className="h-3.5 w-3.5" strokeWidth={2} />
            {eyebrow}
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">{intro}</p>
          <p className="mt-5 text-[12px] font-medium text-white/50">Última actualización: {LEGAL_UPDATED}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            {/* Móvil: índice desplegable */}
            <details className="group rounded-2xl card-surface lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-bold text-carbon [&::-webkit-details-marker]:hidden">
                Contenido
                <ChevronDown className="h-4 w-4 text-ink-500 transition group-open:rotate-180" strokeWidth={2} />
              </summary>
              <div className="border-t border-ink-800 p-2">{toc}</div>
            </details>

            {/* Escritorio: índice fijo */}
            <nav aria-label="Contenido" className="hidden lg:block">
              <p className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">Contenido</p>
              {toc}
              <div className="mt-6 border-t border-ink-800 pt-4">
                <p className="mb-2 px-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-500">Otros documentos</p>
                <ul className="space-y-0.5 text-[13px]">
                  {LEGAL_LINKS.filter((l) => l.href !== current).map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="block rounded-lg px-2.5 py-1.5 font-medium text-ink-400 transition hover:bg-ink-850 hover:text-brand-700">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          <article className="min-w-0 max-w-3xl">
            {summary}
            <div className="divide-y divide-ink-800">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24 py-8 first:pt-2">
                  <h2 className="flex items-start gap-3 font-display text-xl font-bold tracking-tight text-carbon sm:text-2xl">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-[13px] font-bold text-brand-600">
                      {i + 1}
                    </span>
                    {s.title}
                  </h2>
                  <div className="sm:pl-11">{s.body}</div>
                </section>
              ))}
            </div>

            {/* Contacto */}
            <div className="mt-6 rounded-3xl card-surface p-6 sm:p-7">
              <h2 className="font-display text-lg font-bold text-carbon">¿Dudas sobre este documento?</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
                Escríbenos y te respondemos. Si eres vendedor con tienda, también puedes abrir un ticket desde tu panel.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {CONTACT_EMAIL ? (
                  <a href={`mailto:${CONTACT_EMAIL}`} className="btn btn-primary btn-sm">
                    <Mail className="h-4 w-4" strokeWidth={2} />
                    {CONTACT_EMAIL}
                  </a>
                ) : null}
                <Link href="/ayuda" className="btn btn-secondary btn-sm">
                  Centro de ayuda
                </Link>
              </div>
              {(LEGAL_ENTITY.name || LEGAL_ENTITY.rut || LEGAL_ENTITY.address) && (
                <p className="mt-4 border-t border-ink-800 pt-4 text-[12px] leading-relaxed text-ink-400">
                  {[LEGAL_ENTITY.name, LEGAL_ENTITY.rut && `RUT ${LEGAL_ENTITY.rut}`, LEGAL_ENTITY.address].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
