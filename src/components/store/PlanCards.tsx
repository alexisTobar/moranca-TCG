import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { clp } from "@/lib/format";
import { planBenefits, type MarketingPlan } from "@/lib/store-marketing";

/** Tarjetas de precios de las tiendas premium. El plan más completo (con vitrina) se destaca. */
export function PlanCards({
  plans,
  ctaHref,
  ctaLabel,
  tone = "light",
}: {
  plans: MarketingPlan[];
  ctaHref: string;
  ctaLabel: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const best = plans.find((p) => p.showcase)?.code;

  return (
    <div className={`mx-auto grid max-w-4xl gap-5 ${plans.length > 1 ? "md:grid-cols-2" : "max-w-md"}`}>
      {plans.map((p) => {
        const featured = p.code === best && plans.length > 1;
        return (
          <article
            key={p.code}
            className={`relative flex flex-col rounded-3xl p-6 sm:p-7 ${
              dark
                ? featured
                  ? "bg-white text-carbon shadow-2xl shadow-black/30 ring-2 ring-gold-300"
                  : "bg-white/[0.07] text-white ring-1 ring-white/15"
                : featured
                  ? "card-surface ring-2 ring-brand-500 shadow-xl"
                  : "card-surface"
            }`}
          >
            {featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-gold-300 to-gold-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#2a1d00]">
                Más completo
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            {p.description && (
              <p className={`mt-1 text-[13px] leading-relaxed ${dark && !featured ? "text-white/60" : "text-ink-400"}`}>
                {p.description}
              </p>
            )}
            <p className="mt-5 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-bold tracking-tight">{clp(p.priceMonthly)}</span>
              <span className={`text-[13px] font-medium ${dark && !featured ? "text-white/60" : "text-ink-400"}`}>/ mes</span>
            </p>
            <p className={`mt-1 text-[12px] ${dark && !featured ? "text-white/50" : "text-ink-400"}`}>
              Pagas por transferencia · sin renovación automática
            </p>

            <ul className="mt-6 flex-1 space-y-2.5">
              {planBenefits(p).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      dark && !featured ? "bg-gold-300/20 text-gold-300" : "bg-emerald-500/15 text-emerald-600"
                    }`}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className={dark && !featured ? "text-white/85" : "text-ink-300"}>{b}</span>
                </li>
              ))}
            </ul>

            <Link href={ctaHref} className={`btn btn-lg mt-7 w-full justify-center ${featured ? (dark ? "btn-primary" : "btn-primary") : dark ? "btn-glass" : "btn-secondary"}`}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2.25} />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
