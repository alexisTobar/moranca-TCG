import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  LifeBuoy,
  Minus,
  Palette,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { clp } from "@/lib/format";
import { getMarketingPlans } from "@/lib/store-marketing";
import { siteUrl } from "@/lib/seo";
import { PlanCards } from "@/components/store/PlanCards";
import { StoreShowcase } from "@/components/store/StoreShowcase";
import { FaqList, faqJsonLd, type FaqItem } from "@/components/FaqList";
import { JsonLd } from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Abre tu tienda de cartas TCG con link y QR",
  description:
    "Tu propia tienda dentro del marketplace TCG de Chile: banner, logo, colores, link corto y QR con tu logo. Vende Magic, Pokémon, One Piece y Mitos y Leyendas con stock reservado.",
  alternates: { canonical: "/tiendas" },
  openGraph: {
    title: "Abre tu tienda de cartas TCG en Win Condition",
    description: "Link corto, QR con tu logo, tu marca al frente y solo tus productos. Planes desde una mensualidad simple.",
    url: "/tiendas",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Win Condition TCG — cartas TCG en Chile" }],
  },
  twitter: { card: "summary_large_image" },
};

const BENEFITS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: QrCode,
    title: "Link corto y QR con tu logo",
    text: "Compártelo en redes, en tus bolsas o en la mesa del torneo. Quien lo escanea llega directo a tu vitrina.",
  },
  {
    icon: Palette,
    title: "Tu marca al frente",
    text: "Banner, logo, color y barra de anuncio. Tu tienda muestra solo tus productos, sin vendedores de la competencia a la vista.",
  },
  {
    icon: BadgeCheck,
    title: "Sello de Tienda verificada",
    text: "Genera confianza desde el primer vistazo con la insignia y tus reseñas de compradores reales.",
  },
  {
    icon: BarChart3,
    title: "Sabes qué funciona",
    text: "Visitas, escaneos de QR y ventas de los últimos 30 días. En el plan Pro, con gráficos y tus productos más vendidos.",
  },
  {
    icon: Sparkles,
    title: "Más visibilidad",
    text: "Los productos destacados van arriba de tu catálogo y, con el plan Pro, tu tienda puede aparecer en “Tiendas destacadas” del inicio.",
  },
  {
    icon: LifeBuoy,
    title: "Soporte directo",
    text: "Un canal exclusivo con el equipo de Win Condition para resolver dudas de tu tienda, tus pagos o tus órdenes.",
  },
];

const STEPS = [
  { title: "Elige tu plan", text: "Con 1, 3, 6 o 12 meses. Sin renovación automática: tú decides cuándo seguir." },
  { title: "Transfiere y sube el comprobante", text: "Te damos los datos y un código único para identificar tu pago. Es privado y solo lo ve el administrador." },
  { title: "Revisamos y activas tu tienda", text: "Al aprobar el pago, tu tienda queda publicada. Personalízala cuando quieras desde tu panel." },
];

export default async function StoresLandingPage() {
  const [plans, user] = await Promise.all([getMarketingPlans(), getCurrentUser()]);

  // El botón lleva al paso que le corresponde a cada persona.
  const cta =
    user && (user.role === "SELLER" || user.role === "ADMIN")
      ? { href: "/panel/tienda", label: "Elegir mi plan", hint: "Ya eres vendedor: elige tu plan desde tu panel." }
      : user
        ? { href: "/cuenta", label: "Solicitar ser vendedor", hint: "Primero solicita ser vendedor desde tu cuenta; luego eliges tu plan." }
        : { href: "/registro", label: "Crear mi cuenta", hint: "Crea tu cuenta, solicita ser vendedor y elige tu plan." };

  const from = plans.length ? Math.min(...plans.map((p) => p.priceMonthly)) : 0;

  const faqs: FaqItem[] = [
    {
      q: "¿Necesito un dominio propio para tener mi tienda?",
      a: "No. Tu tienda vive dentro de Win Condition TCG con un link corto y un QR propios, listos para compartir. No tienes que comprar ni configurar ningún dominio.",
    },
    {
      q: "¿Cómo pago la membresía?",
      a: "Por transferencia bancaria. Eliges el plan y los meses, te mostramos los datos con un código único, transfieres y subes el comprobante. Cuando lo revisamos, tu tienda se activa.",
    },
    {
      q: "¿Tengo que ser vendedor antes de contratar un plan?",
      a: "Sí. Crea tu cuenta, solicita ser vendedor desde “Mi cuenta” y, una vez aprobado, ya puedes publicar cartas y elegir tu plan desde el panel.",
    },
    {
      q: "¿Qué pasa si mi plan vence?",
      a: "Tu tienda deja de mostrarse y tu perfil normal de vendedor sigue funcionando. Tu diseño y tus datos se conservan: al renovar, todo vuelve a estar como lo dejaste.",
    },
    {
      q: "¿Puedo vender sin contratar un plan?",
      a: "Sí. Publicar y vender es gratis con tu perfil de vendedor, que también tiene link y QR para compartir. La tienda propia agrega tu marca, tu vitrina y las herramientas para crecer.",
    },
    {
      q: "¿Mis clientes compran en mi tienda o en Win Condition?",
      a: "Compran dentro de tu tienda, con tu marca al frente, y el pago sigue el mismo proceso seguro de siempre: stock reservado, código de pago y comprobante.",
    },
  ];

  return (
    <>
      <JsonLd
        data={[
          faqJsonLd(faqs),
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl() },
              { "@type": "ListItem", position: 2, name: "Abre tu tienda", item: `${siteUrl()}/tiendas` },
            ],
          },
        ]}
      />

      {/* HERO */}
      <section className="bg-hero relative overflow-hidden text-white">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="animate-blob pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-16 text-center lg:pb-28 lg:pt-24">
          <span className="animate-fade-up glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-200">
            <Store className="h-3.5 w-3.5" strokeWidth={2} />
            Para vendedores de cartas
          </span>
          <h1 className="animate-fade-up delay-1 mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Tu tienda de cartas <span className="text-gold-gradient">propia</span>, en el marketplace TCG de Chile
          </h1>
          <p className="animate-fade-up delay-2 mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed text-white/70">
            Un link y un QR que llevan a tu vitrina: tu logo, tus colores y solo tus productos. Tus clientes compran con
            stock reservado y pagan por transferencia, y tú te enfocas en vender.
          </p>
          <div className="animate-fade-up delay-3 mt-8 flex flex-wrap justify-center gap-3">
            <Link href="#planes" className="btn btn-gold btn-lg">
              Ver planes desde {clp(from)}/mes
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
            <Link href="#como-funciona" className="btn btn-glass btn-lg">
              Cómo funciona
            </Link>
          </div>
          <p className="mt-5 text-[12px] text-white/45">Sin dominio propio · sin renovación automática · cancela cuando quieras</p>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="mx-auto max-w-7xl px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">Todo lo que necesitas</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
            Una vitrina profesional, sin armar una web
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="lift rounded-2xl card-surface p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
                <b.icon className="h-6 w-6" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-carbon">{b.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-400">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANES */}
      <section id="planes" className="scroll-mt-24 bg-ink-900 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">Planes</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
              Elige cómo quieres crecer
            </h2>
            <p className="mt-3 text-[15px] text-ink-400">{cta.hint}</p>
          </div>
          <div className="mt-12">
            <PlanCards plans={plans} ctaHref={cta.href} ctaLabel={cta.label} />
          </div>

          {/* Comparativa */}
          <div className="mx-auto mt-14 max-w-4xl overflow-x-auto rounded-2xl card-surface">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <caption className="sr-only">Comparación entre el perfil gratis y los planes de tienda</caption>
              <thead>
                <tr className="border-b border-ink-800 text-[12px] uppercase tracking-wider text-ink-400">
                  <th scope="col" className="px-4 py-3 font-semibold">Incluye</th>
                  <th scope="col" className="px-4 py-3 text-center font-semibold">Perfil gratis</th>
                  {plans.map((p) => (
                    <th key={p.code} scope="col" className="px-4 py-3 text-center font-semibold text-carbon">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {(
                  [
                    ["Publicar y vender", () => true, true],
                    ["Perfil con link y QR para compartir", () => true, true],
                    ["Tienda propia (banner, logo y colores)", () => true, false],
                    ["QR con tu logo al centro", () => true, false],
                    ["Insignia “Tienda verificada”", () => true, false],
                    ["Soporte directo con el equipo", () => true, false],
                  ] as Array<[string, () => boolean, boolean]>
                ).map(([label, has, free]) => (
                  <tr key={label}>
                    <th scope="row" className="px-4 py-3 font-medium text-ink-300">{label}</th>
                    <Cell ok={free} />
                    {plans.map((p) => (
                      <Cell key={p.code} ok={has()} />
                    ))}
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-ink-300">Productos destacados</th>
                  <Cell ok={false} />
                  {plans.map((p) => (
                    <td key={p.code} className="px-4 py-3 text-center font-semibold text-carbon">
                      hasta {p.maxFeatured}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-ink-300">Estadísticas</th>
                  <Cell ok={false} />
                  {plans.map((p) => (
                    <td key={p.code} className="px-4 py-3 text-center font-semibold text-carbon">
                      {p.advancedStats ? "Completas" : "Básicas"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-3 font-medium text-ink-300">Vitrina “Tiendas destacadas” en el inicio</th>
                  <Cell ok={false} />
                  {plans.map((p) => (
                    <Cell key={p.code} ok={p.showcase} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">Cómo funciona</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">
            De la transferencia a tu tienda en 3 pasos
          </h2>
        </div>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl card-surface p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-display text-lg font-bold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-carbon">{s.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-ink-400">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-[13px] text-ink-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
          Tus clientes compran con stock reservado, código de pago y comprobante en cada orden.
        </p>
      </section>

      {/* Tiendas reales (solo si hay destacadas) */}
      <StoreShowcase />

      {/* FAQ */}
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-16 lg:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-carbon sm:text-4xl">Preguntas frecuentes</h2>
        </div>
        <div className="mt-8">
          <FaqList items={faqs} />
        </div>
      </section>

      {/* CIERRE */}
      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="bg-hero relative overflow-hidden rounded-[2rem] px-6 py-14 text-center text-white sm:px-14">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Lleva tus cartas a otro nivel</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Abre tu tienda hoy y empieza a compartir tu link y tu QR con la comunidad TCG de Chile.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={cta.href} className="btn btn-gold btn-lg">
                {cta.label}
                <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Link href="/vendedores" className="btn btn-glass btn-lg">
                Ver otros vendedores
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Cell({ ok }: { ok: boolean }) {
  return (
    <td className="px-4 py-3 text-center">
      {ok ? (
        <Check className="mx-auto h-4 w-4 text-emerald-600" strokeWidth={2.5} aria-label="Incluido" />
      ) : (
        <Minus className="mx-auto h-4 w-4 text-ink-600" strokeWidth={2} aria-label="No incluido" />
      )}
    </td>
  );
}
