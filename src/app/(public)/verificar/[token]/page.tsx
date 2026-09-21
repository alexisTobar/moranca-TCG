import type { Metadata } from "next";
import { VerifyEmailAction } from "@/components/account/VerifyEmailAction";

export const metadata: Metadata = {
  title: "Confirmar email",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <VerifyEmailAction token={token} />
    </div>
  );
}
