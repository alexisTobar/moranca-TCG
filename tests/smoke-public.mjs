// Read-only checks. Does not create users, orders or test fixtures.
const base = process.env.BASE_URL || "http://127.0.0.1:3012";
const routes = ["/", "/cartas", "/carrito", "/ingresar", "/registro", "/recuperar", "/ayuda", "/tiendas", "/vendedores", "/noticias", "/terminos-y-condiciones", "/politica-de-privacidad", "/politica-de-cookies", "/envios-y-pagos", "/devoluciones", "/quienes-somos", "/robots.txt", "/sitemap.xml"];
let failed = 0;
for (const path of routes) {
  const res = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  const body = await res.text();
  const ok = res.status === 200 && !body.includes("No pudimos cargar esta sección");
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${path}: ${res.status}`);
}
for (const path of ["/cuenta", "/checkout", "/panel", "/panel/consentimientos", "/panel/usuarios", "/panel/ordenes", "/panel/publicaciones", "/panel/tiendas", "/panel/soporte", "/panel/analitica", "/panel/auditoria", "/panel/configuracion", "/panel/perfil", "/panel/publicar", "/panel/descuentos", "/panel/reportes", "/panel/tienda"]) {
  const res = await fetch(base + path, { redirect: "manual" });
  const ok = [307, 308].includes(res.status) && res.headers.get("location")?.includes("/ingresar");
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} guest ${path}: ${res.status}`);
}
for (const path of ["/api/admin/consents", "/api/admin/consents?kind=legacy"]) {
  const res = await fetch(base + path);
  if (res.status !== 401) failed++;
  console.log(`${res.status === 401 ? "PASS" : "FAIL"} guest ${path}: ${res.status}`);
}
console.log(`Failures: ${failed}`);
process.exitCode = failed ? 1 : 0;
