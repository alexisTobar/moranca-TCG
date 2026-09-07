import type { NextConfig } from "next";

const config: NextConfig = {
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
    ],
  },
  poweredByHeader: false,
};

export default config;
