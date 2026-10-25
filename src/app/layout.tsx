import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { UsageConsent } from "@/components/UsageConsent";

const bodyFont = Roboto({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "TCG Cardeck — Compra y vende cartas coleccionables en Chile",
    template: "%s · TCG Cardeck",
  },
  description:
    "Singles, sobres sellados y mazos armados de Magic, Pokémon, One Piece y Mitos y Leyendas. Envíos a todo Chile.",
  keywords: [
    "cartas",
    "TCG Chile",
    "Magic",
    "Pokémon",
    "One Piece",
    "Mitos y Leyendas",
    "singles",
    "mazos",
  ],
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "TCG Cardeck",
    title: "TCG Cardeck — Cartas coleccionables en Chile",
    description:
      "Singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "TCG Cardeck — cartas TCG en Chile" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#080b16",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL" className={bodyFont.variable}>
      <body className={`${bodyFont.className} min-h-dvh antialiased`}>
        {children}
        <UsageConsent />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
