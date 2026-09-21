import { PrivacyCard } from "@/components/account/PrivacyCard";
import { TwoFactorSection } from "@/components/account/TwoFactorSection";
import { VerifyEmailBanner } from "@/components/account/VerifyEmailBanner";
import { emailVerificationRequired } from "@/lib/verification";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safeQuery } from "@/lib/catalog";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { SellerRequestBox } from "@/components/account/SellerRequestBox";
import { SecurityCard } from "@/components/account/SecurityCard";
import { OrderCard, type AccountOrder } from "@/components/account/OrderCard";
import { expireOverdueOrders } from "@/lib/order-payments";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/ingresar?next=/cuenta");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      rut: true,
      sellerRequestStatus: true,
      emailVerifiedAt: true,
      createdAt: true,
      totpEnabledAt: true,
    },
  });
  if (!user) redirect("/ingresar?next=/cuenta");

  // Así una orden vencida se ve cancelada en cuanto el comprador entra, sin
  // esperar al cron diario.
  await safeQuery(() => expireOverdueOrders(), 0);

  const rawOrders = await safeQuery(
    () =>
      prisma.order.findMany({
        where: { buyerId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          status: true,
          total: true,
          paymentMethod: true,
          paymentReference: true,
          paymentDueAt: true,
          receiptUploadedAt: true,
          shipMethod: true,
          trackingCourier: true,
          trackingCode: true,
          createdAt: true,
          seller: {
            select: {
              name: true,
              bankName: true,
              bankAccountType: true,
              bankAccountNumber: true,
              bankHolderName: true,
              bankRut: true,
            },
          },
          items: { select: { id: true, title: true, quantity: true, unitPrice: true } },
          review: { select: { id: true, rating: true, comment: true, sellerReply: true } },
        },
      }),
    []
  );

  const orders: AccountOrder[] = rawOrders.map((o) => ({
    id: o.id,
    status: o.status,
    total: o.total,
    paymentMethod: o.paymentMethod,
    sellerName: o.seller?.name ?? "Vendedor",
    bankTransfer: o.seller?.bankAccountNumber
      ? {
          bankName: o.seller.bankName,
          accountType: o.seller.bankAccountType,
          accountNumber: o.seller.bankAccountNumber,
          holderName: o.seller.bankHolderName,
          rut: o.seller.bankRut,
        }
      : null,
    paymentReference: o.paymentReference,
    paymentDueAt: o.paymentDueAt?.toISOString() ?? null,
    receiptUploadedAt: o.receiptUploadedAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    shipMethod: o.shipMethod,
    trackingCourier: o.trackingCourier,
    trackingCode: o.trackingCode,
    items: o.items,
    review: o.review,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Mi cuenta</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          {user.email} · {user.role === "SELLER" ? "Vendedor" : user.role === "ADMIN" ? "Administrador" : "Comprador"}
        </p>
      </header>

      {emailVerificationRequired(user) && <VerifyEmailBanner email={user.email} />}

      <section className="rounded-2xl card-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-carbon">Mis datos</h2>
        <AccountProfileForm
          name={user.name}
          phone={user.phone}
          address={user.address}
          rut={user.rut}
        />
      </section>

      <SecurityCard>
        <TwoFactorSection enabled={Boolean(user.totpEnabledAt)} />
      </SecurityCard>

      <PrivacyCard canDelete={user.role !== "ADMIN"} />

      {user.role === "BUYER" && <SellerRequestBox status={user.sellerRequestStatus} />}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-carbon">Mis compras</h2>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-700 p-10 text-center text-[13px] text-ink-400">
            Todavía no tienes compras.
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} userId={user.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
