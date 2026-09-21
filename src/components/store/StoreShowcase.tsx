import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { activeStoreWhere } from "@/lib/store";
import { storeThemeVars } from "@/lib/store-theme";
import { Reveal } from "@/components/Reveal";

/** Vitrina del inicio: tiendas con plan vigente que el administrador destacó. No pinta nada si no hay. */
export async function StoreShowcase() {
  const stores = await safeQuery(
    () =>
      prisma.store.findMany({
        where: { ...activeStoreWhere(), featured: true, plan: { showcase: true }, seller: { active: true } },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: {
          id: true,
          displayName: true,
          tagline: true,
          logoUrl: true,
          bannerUrl: true,
          accentColor: true,
          seller: {
            select: {
              name: true,
              slug: true,
              _count: { select: { listings: { where: { status: "ACTIVE" } } } },
            },
          },
        },
      }),
    []
  );
  if (stores.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-16">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-brand-600">Tiendas oficiales</p>
        <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-carbon sm:text-[2rem]">
          Tiendas destacadas
        </h2>
        <p className="mt-1.5 text-[14px] text-ink-400">Vendedores con su propia tienda en Win Condition</p>
      </div>
      <Reveal className="stagger mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stores.map((s) => {
          const name = s.displayName || s.seller.name;
          return (
            <Link
              key={s.id}
              href={`/tienda/${s.seller.slug}`}
              style={storeThemeVars(s.accentColor) as React.CSSProperties}
              className="group lift overflow-hidden rounded-2xl card-surface"
            >
              <div className="relative h-24 overflow-hidden">
                {s.bannerUrl ? (
                  <Image src={s.bannerUrl} alt="" fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" unoptimized />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-700))" }}
                  />
                )}
              </div>
              <div className="relative px-4 pb-4">
                <span className="relative -mt-7 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-white bg-white font-display text-xl font-bold text-brand-600 shadow-md">
                  {s.logoUrl ? (
                    <Image src={s.logoUrl} alt={name} fill sizes="56px" className="object-cover" unoptimized />
                  ) : (
                    name.charAt(0).toUpperCase()
                  )}
                </span>
                <p className="mt-2.5 flex items-center gap-1.5 truncate font-display text-[16px] font-bold text-carbon">
                  <span className="truncate">{name}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" strokeWidth={2.25} />
                </p>
                <p className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-[12px] leading-relaxed text-ink-400">
                  {s.tagline || `${s.seller._count.listings} publicaciones activas`}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-brand-600">
                  Visitar tienda
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" strokeWidth={2.25} />
                </span>
              </div>
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}
