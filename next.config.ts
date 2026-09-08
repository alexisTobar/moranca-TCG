import type { NextConfig } from "next";

const config: NextConfig = {
  // TEMP: distDir aislado solo para no chocar con otro `next dev` corriendo
  // sobre esta misma carpeta durante la verificación. Se revierte después.
  distDir: ".next-verify",
  images: {
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
};

export default config;
