import { ChevronDown } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

/** Preguntas frecuentes desplegables (sin JavaScript: <details>). El mismo arreglo alimenta los datos estructurados. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-ink-800 overflow-hidden rounded-2xl card-surface">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-carbon transition hover:bg-ink-900 [&::-webkit-details-marker]:hidden">
            {f.q}
            <ChevronDown className="h-4 w-4 shrink-0 text-ink-500 transition group-open:rotate-180" strokeWidth={2} />
          </summary>
          <p className="px-5 pb-5 text-[14px] leading-relaxed text-ink-400">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Datos estructurados FAQPage a partir de las mismas preguntas que se ven en pantalla. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
