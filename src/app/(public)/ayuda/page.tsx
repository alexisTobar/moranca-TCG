import type { Metadata } from "next";
import { CONDITIONS } from "@/lib/games";

export const metadata: Metadata = {
  title: "Ayuda",
  description: "Cómo comprar, envíos y estados de carta en Dream Deck TCG.",
};

const FAQ = [
  {
    q: "¿Cómo compro una carta?",
    a: "Entra a la publicación, elige la cantidad y presiona Comprar ahora. Completa tus datos de despacho y serás redirigido a Mercado Pago para pagar con tarjeta, débito o transferencia.",
  },
  {
    q: "¿Los precios incluyen envío?",
    a: "No. El precio publicado corresponde solo al producto. El costo de despacho se coordina con el vendedor según la región de destino.",
  },
  {
    q: "¿De dónde salen las imágenes de las cartas?",
    a: "Las tomamos automáticamente de los catálogos oficiales de cada juego: Scryfall para Magic, pokemontcg.io para Pokémon, dotGG para One Piece y api.myl.cl para Mitos y Leyendas. Los precios los define cada vendedor.",
  },
  {
    q: "¿Puedo vender mis cartas aquí?",
    a: "Los perfiles de vendedor los crea el administrador de Dream Deck TCG. Escríbenos y habilitamos tu cuenta para publicar singles, sellados y mazos.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-carbon">Centro de ayuda</h1>
      <p className="mt-2 text-[14px] text-ink-400">
        Todo lo que necesitas saber para comprar y vender en Dream Deck TCG.
      </p>

      <section className="mt-10 space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="rounded-xl card-surface p-5">
            <summary className="cursor-pointer font-semibold text-ink-200">
              {item.q}
            </summary>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-400">{item.a}</p>
          </details>
        ))}
      </section>

      <section id="envios" className="mt-12 scroll-mt-40">
        <h2 className="font-display text-2xl font-bold text-carbon">Envíos</h2>
        <ul className="mt-4 space-y-2 text-[13px] leading-relaxed text-ink-400">
          <li>
            <strong className="text-ink-200">Región Metropolitana:</strong> 1 a 3 días
            hábiles.
          </li>
          <li>
            <strong className="text-ink-200">Regiones:</strong> 3 a 7 días hábiles vía
            Starken, Chilexpress o Correos de Chile.
          </li>
          <li>
            <strong className="text-ink-200">Retiro:</strong> se coordina directamente con
            el vendedor.
          </li>
          <li>
            Las cartas viajan en sleeve + toploader y sobre rígido para singles de alto
            valor.
          </li>
        </ul>
      </section>

      <section id="estados" className="mt-12 scroll-mt-40">
        <h2 className="font-display text-2xl font-bold text-carbon">Estados de carta</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-ink-700">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-ink-900 text-[11px] uppercase tracking-wider text-ink-300">
              <tr>
                <th className="px-4 py-2.5">Código</th>
                <th className="px-4 py-2.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {CONDITIONS.map((c) => (
                <tr key={c.value} className="bg-ink-900/40">
                  <td className="px-4 py-2.5 font-bold text-accent-400">{c.value}</td>
                  <td className="px-4 py-2.5 text-ink-300">{c.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
