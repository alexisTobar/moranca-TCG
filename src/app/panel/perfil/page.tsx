import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SellerProfileForm } from "@/components/SellerProfileForm";

export const dynamic = "force-dynamic";

export default async function SellerProfilePage() {
  const session = await getCurrentUser();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      name: true,
      phone: true,
      address: true,
      rut: true,
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankHolderName: true,
      bankRut: true,
    },
  });
  if (!user) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-carbon">Mi perfil</h1>
        <p className="mt-1 text-[13px] text-ink-400">
          Tus datos y la cuenta bancaria donde te van a transferir.
        </p>
      </header>

      <SellerProfileForm initial={user} />
    </div>
  );
}
