import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Dream Deck TCG — Compra y vende cartas coleccionables en Chile",
    template: "%s · Dream Deck TCG",
  },
  description:
    "Singles, sobres sellados y mazos armados de Magic, Pokémon, One Piece y Mitos y Leyendas. Envíos a todo Chile con pago protegido.",
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
    siteName: "Dream Deck TCG",
    title: "Dream Deck TCG — Cartas coleccionables en Chile",
    description:
      "Singles, sellados y mazos de Magic, Pokémon, One Piece y Mitos y Leyendas.",
  },
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
    <html lang="es-CL">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
