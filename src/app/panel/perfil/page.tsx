import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SellerProfileForm } from "@/components/SellerProfileForm";
import { sellerRegion } from "@/lib/location";
import { isStoreActive, siteOrigin } from "@/lib/store";
import { buildQr } from "@/lib/qr";
import { ShareQrCard } from "@/components/store/ShareQrCard";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      slug: true,
      phone: true,
      address: true,
      rut: true,
      avatarUrl: true,
      city: true,
      region: true,
      offersShipping: true,
      offersPickup: true,
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankHolderName: true,
      bankRut: true,
      store: { select: { status: true, planId: true, activeUntil: true, logoUrl: true } },
    },
  });
  if (!user) return null;

  // Todos los perfiles se pueden compartir. Con tienda premium vigente el link lleva a la tienda y el QR al logo.
  const { store, slug, ...form } = user;
  const premium = Boolean(store && isStoreActive(store));
  const origin = await siteOrigin();
  const shareUrl = `${origin}/${premium ? "t" : "v"}/${slug}`;
  const logo = premium ? store?.logoUrl ?? null : null;
  const qr = buildQr(shareUrl, Boolean(logo));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Mi perfil</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Tus datos y la cuenta bancaria donde te van a transferir.
        </p>
      </header>

      <div className="max-w-xl">
        <ShareQrCard
          url={shareUrl}
          displayUrl={shareUrl.replace(/^https?:\/\//, "")}
          qr={qr}
          logoUrl={logo}
          filename={`qr-${slug}`}
          title="Comparte tu perfil"
          hint={
            premium
              ? "Tu link lleva a tu tienda y tu QR lleva el logo de tu tienda."
              : "Cualquier persona que escanee el QR o abra el link verá tus publicaciones."
          }
        />
        {!premium && (
          <p className="mt-2 text-[12px] text-ink-400">
            ¿Quieres tu propia tienda con banner, colores y QR con tu logo?{" "}
            <Link href="/panel/tienda" className="font-semibold text-brand-600 hover:text-brand-700">
              Conoce los planes
            </Link>
          </p>
        )}
      </div>

      <SellerProfileForm
        initial={{ ...form, region: sellerRegion({ region: form.region, city: form.city }) }}
      />
    </div>
  );
}
