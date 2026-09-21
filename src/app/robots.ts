import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Zonas privadas o sin valor para buscadores: panel, cuenta, compra y APIs.
        disallow: ["/panel", "/api/", "/cuenta", "/checkout", "/carrito", "/ingresar", "/registro", "/recuperar", "/t/", "/v/"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
