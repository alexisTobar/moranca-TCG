export const USAGE_PAGES = ["inicio", "catalogo", "producto", "carta", "tiendas", "tienda", "vendedores", "vendedor", "carrito", "checkout", "cuenta", "noticias", "ayuda", "legal"] as const;
export function usagePage(path: string): typeof USAGE_PAGES[number] | null {
  if (path === "/") return "inicio";
  const segment = path.split("/")[1];
  const routes: Record<string, typeof USAGE_PAGES[number]> = {
    cartas: "catalogo", producto: "producto", carta: "carta", tiendas: "tiendas", tienda: "tienda",
    vendedores: "vendedores", vendedor: "vendedor", carrito: "carrito", checkout: "checkout",
    cuenta: "cuenta", noticias: "noticias", ayuda: "ayuda", "terminos-y-condiciones": "legal",
    "politica-de-privacidad": "legal", "politica-de-cookies": "legal", "envios-y-pagos": "legal", devoluciones: "legal",
  };
  return routes[segment] ?? null;
}
export function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
export function previousWeek(now = new Date()) {
  const end = utcDay(now);
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  return { start: new Date(end.getTime() - 7 * 86400000), end };
}
