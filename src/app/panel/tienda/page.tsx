import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Eye, LockKeyhole, Package, QrCode, ShoppingBag, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clp } from "@/lib/format";
import {
  ensureAdminPro,
  ensureDefaultPlans,
  ensureStore,
  getMembershipBank,
  isStoreActive,
  siteOrigin,
} from "@/lib/store";
import { getStoreStats } from "@/lib/store-stats";
import { buildQr } from "@/lib/qr";
import { DEFAULT_ACCENT } from "@/lib/store-theme";
import { ShareQrCard } from "@/components/store/ShareQrCard";
import { StoreEditor, type FeaturableListing } from "@/components/store/StoreEditor";
import { StorePlanPanel, type SubscriptionRow } from "@/components/store/StorePlanPanel";

export const dynamic = "force-dynamic";

function Kpi({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div className="rounded-2xl card-surface p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-850 text-brand-600">
        <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
      </span>
      <p className="mt-3 font-display text-2xl font-bold text-carbon">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
    </div>
  );
}

export default async function MyStorePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "SELLER" && user.role !== "ADMIN") redirect("/panel");

  await ensureDefaultPlans();
  const isAdmin = user.role === "ADMIN";
  if (isAdmin) await ensureAdminPro(user.id);
  const store = await ensureStore(user.id);
  const active = isStoreActive(store);

  const [plans, subs, listings, bank, origin] = await Promise.all([
    prisma.storePlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.storeSubscription.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { plan: { select: { name: true } } },
    }),
    prisma.listing.findMany({
      where: { sellerId: user.id, status: "ACTIVE", stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { id: true, title: true, imageUrl: true, price: true },
    }),
    getMembershipBank(),
    siteOrigin(),
  ]);

  const rows: SubscriptionRow[] = subs.map((s) => ({
    id: s.id,
    planName: s.plan.name,
    months: s.months,
    amount: s.amount,
    status: s.status,
    reference: s.reference,
    receiptUploadedAt: s.receiptUploadedAt?.toISOString() ?? null,
    note: s.note,
    createdAt: s.createdAt.toISOString(),
    periodEnd: s.periodEnd?.toISOString() ?? null,
  }));
  const pending = rows.find((r) => r.status === "PENDING") ?? null;
  const history = rows.filter((r) => r.status !== "PENDING");

  const stats = active ? await getStoreStats(store.id, user.id) : null;
  const advanced = Boolean(store.plan?.advancedStats);
  const maxFeatured = store.plan?.maxFeatured ?? 6;

  // El QR de la tienda lleva el logo al centro (corrección de errores alta) solo si hay logo.
  const storeUrl = `${origin}/t/${user.slug}?src=qr`;
  const shownUrl = `${origin}/t/${user.slug}`.replace(/^https?:\/\//, "");
  const qr = buildQr(storeUrl, Boolean(store.logoUrl));
  const maxViews = stats ? Math.max(1, ...stats.series.map((s) => s.views)) : 1;

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Mi tienda</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Tu propia vitrina: solo tus productos, con tu banner, tus colores y tu link.
        </p>
      </header>

      {isAdmin ? (
        <div className="flex items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700">
            <BadgeCheck className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-display text-base font-bold text-carbon">
              Plan {store.plan?.name ?? "Pro"} incluido en tu cuenta de administrador
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-400">
              Tienes todo lo del plan Pro, sin comprarlo ni renovarlo y sin fecha de vencimiento: tienda propia,
              hasta {store.plan?.maxFeatured ?? 12} destacados, estadísticas completas, vitrina en el inicio y QR con tu logo.
            </p>
          </div>
        </div>
      ) : (
        <StorePlanPanel
          active={active}
          planName={store.plan?.name ?? null}
          activeUntil={store.activeUntil?.toISOString() ?? null}
          suspended={store.status === "SUSPENDED"}
          plans={plans.map((p) => ({
            id: p.id,
            code: p.code,
            name: p.name,
            description: p.description,
            priceMonthly: p.priceMonthly,
            maxFeatured: p.maxFeatured,
            advancedStats: p.advancedStats,
            showcase: p.showcase,
          }))}
          pending={pending}
          history={history}
          bank={bank}
        />
      )}

      {active && (
        <>
          <ShareQrCard
            url={storeUrl}
            displayUrl={shownUrl}
            qr={qr}
            logoUrl={store.logoUrl}
            filename={`qr-${user.slug}`}
            title="Link y QR de tu tienda"
            hint={
              store.logoUrl
                ? "Tu QR lleva el logo de tu tienda al centro. Imprímelo en tu local, tus bolsas o tus redes."
                : "Sube un logo abajo y tu QR lo llevará al centro."
            }
          />
          <Link
            href={`/tienda/${user.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver mi tienda como la ven los compradores →
          </Link>

          {stats && (
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-carbon">Últimos 30 días</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Kpi icon={Eye} label="Visitas" value={String(stats.views30)} />
                <Kpi icon={QrCode} label="Escaneos de QR" value={String(stats.qrScans30)} />
                <Kpi icon={Package} label="Productos activos" value={String(stats.activeListings)} />
                <Kpi icon={ShoppingBag} label="Ventas" value={String(stats.orders30)} />
              </div>

              {advanced ? (
                <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-2xl card-surface p-5">
                    <p className="text-[13px] font-bold text-carbon">Visitas por día</p>
                    <div className="mt-4 flex h-28 items-end gap-[3px]" aria-label="Visitas por día">
                      {stats.series.map((s) => (
                        <div
                          key={s.day}
                          title={`${s.day}: ${s.views} visitas, ${s.qrScans} por QR`}
                          className="min-w-0 flex-1 rounded-t bg-brand-500/80"
                          style={{ height: `${Math.max(3, (s.views / maxViews) * 100)}%`, opacity: s.views ? 1 : 0.25 }}
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-[12px] text-ink-400">
                      Vendiste <strong className="text-carbon">{clp(stats.revenue30)}</strong> en {stats.orders30}{" "}
                      {stats.orders30 === 1 ? "orden" : "órdenes"}.
                    </p>
                  </div>
                  <div className="rounded-2xl card-surface p-5">
                    <p className="text-[13px] font-bold text-carbon">Lo más vendido</p>
                    {stats.topSold.length === 0 ? (
                      <p className="mt-3 text-[12px] text-ink-400">Aún no hay ventas en este período.</p>
                    ) : (
                      <ul className="mt-3 space-y-2 text-[12px]">
                        {stats.topSold.map((t) => (
                          <li key={t.title} className="flex items-center justify-between gap-3">
                            <span className="truncate text-ink-200">{t.title}</span>
                            <span className="shrink-0 font-bold text-carbon">{t.quantity}x</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-ink-700 p-4 text-[13px] text-ink-300">
                  <Sparkles className="h-5 w-5 shrink-0 text-brand-600" strokeWidth={1.75} />
                  Con el plan Pro ves el gráfico de visitas por día, tus ingresos y lo más vendido.
                </div>
              )}
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-carbon">Personaliza tu tienda</h2>
        {!active ? (
          <div className="flex items-start gap-4 rounded-2xl border border-dashed border-ink-700 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink-850 text-ink-500">
              <LockKeyhole className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <p className="font-display text-base font-bold text-carbon">Disponible con tu membresía</p>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-400">
                {store.planId
                  ? "Tu plan venció o está suspendido, así que la edición está bloqueada. Tus cambios anteriores se conservan y vuelven a estar disponibles al renovar."
                  : "Con una membresía activas tu tienda propia: banner, logo, colores, anuncio, redes, productos destacados y QR con tu logo. Elige un plan arriba para desbloquearlo."}
              </p>
            </div>
          </div>
        ) : (
        <StoreEditor
          initial={{
            displayName: store.displayName ?? "",
            tagline: store.tagline ?? "",
            about: store.about ?? "",
            logoUrl: store.logoUrl,
            bannerUrl: store.bannerUrl,
            accentColor: store.accentColor || DEFAULT_ACCENT,
            instagram: store.instagram ?? "",
            facebook: store.facebook ?? "",
            whatsapp: store.whatsapp ?? "",
            website: store.website ?? "",
            announcement: store.announcement ?? "",
            featuredListingIds: store.featuredListingIds,
          }}
          listings={listings as FeaturableListing[]}
          maxFeatured={maxFeatured}
          fallbackName={user.name}
        />
        )}
      </section>
    </div>
  );
}
