import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.scrydex.com" },
      { protocol: "https", hostname: "static.dotgg.gg" },
      { protocol: "https", hostname: "api.myl.cl" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "static.wikia.nocookie.net" },
    ],
  },
  poweredByHeader: false,
  async headers() {
    // Lo privado (sesión, cuenta, panel, comprobantes) nunca se guarda en cachés compartidas ni del navegador.
    const privateCache = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
    return ["/panel/:path*", "/cuenta/:path*", "/checkout", "/ingresar/:path*", "/api/auth/:path*", "/api/account/:path*", "/api/admin/:path*", "/api/users/:path*", "/api/orders/:path*"].map(
      (source) => ({ source, headers: privateCache })
    );
  },
};

export default config;
