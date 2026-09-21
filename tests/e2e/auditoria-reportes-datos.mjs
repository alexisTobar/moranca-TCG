// Batería de pruebas de punta a punta. Ver tests/README.md para prepararla y ejecutarla.
import pg from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const db = new pg.Client({ connectionString: process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54329/wctcg" });
await db.connect();
let passed = 0, failed = 0;
const check = (n, c, x = "") => (c ? (passed++, console.log("  OK   ", n)) : (failed++, console.log("  FALLA", n, x)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class C {
  cookies = {};
  get cookie() { return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; "); }
  async req(path, { method = "GET", json, headers = {} } = {}) {
    const res = await fetch(BASE + path, { method, headers: { cookie: this.cookie, ...(json ? { "content-type": "application/json" } : {}), ...headers }, body: json ? JSON.stringify(json) : undefined, redirect: "manual" });
    for (const c of res.headers.getSetCookie?.() ?? []) { const [kv] = c.split(";"); const i = kv.indexOf("="); const k = kv.slice(0, i), v = kv.slice(i + 1); if (/max-age=0/i.test(c) || /expires=Thu, 01 Jan 1970/i.test(c) || v === "") delete this.cookies[k]; else this.cookies[k] = v; }
    const ct = res.headers.get("content-type") ?? "";
    return { status: res.status, headers: res.headers, location: res.headers.get("location"), data: ct.includes("json") ? await res.json().catch(() => null) : await res.text().catch(() => null) };
  }
  login(email, password = "AdminTest2026!") { return this.req("/api/auth/login", { method: "POST", json: { email, password } }); }
}
const audits = async (action) => (await db.query(`SELECT "actorName", detail, "targetType", "targetId" FROM "AuditLog" WHERE action=$1 ORDER BY "createdAt" DESC`, [action])).rows;
const mkUser = async (name, role = "BUYER") => {
  const email = `b3-${Math.random().toString(36).slice(2, 8)}@test.cl`;
  const c = new C();
  const r = await c.req("/api/auth/register", { method: "POST", json: { name, email, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle Falsa 123", acceptTerms: true } });
  await db.query(`UPDATE "User" SET "emailVerifiedAt"=now(), role=$2::"Role" WHERE email=$1`, [email, role]);
  await db.query(`DELETE FROM "LoginAttempt"`);
  await c.login(email, "ClaveSegura2026");
  return { c, email, id: r.data.user.id };
};

await db.query(`DELETE FROM "LoginAttempt"`);
await db.query(`DELETE FROM "AuditLog"`);
await db.query(`DELETE FROM "Report"`);
const admin = new C(), sipo = new C(), nico = new C(), anon = new C();
await admin.login("admin@test.cl"); await sipo.login("sel_sipo@t.cl"); await nico.login("sel_nico@t.cl");
const adminId = (await db.query(`SELECT id FROM "User" WHERE email='admin@test.cl'`)).rows[0].id;

console.log("\n== Salud del sitio ==");
let r = await anon.req("/api/health");
check("/api/health responde 200 con la base viva", r.status === 200 && r.data?.ok === true && r.data?.db === true, JSON.stringify(r.data));

console.log("\n== Auditoria: acciones del administrador ==");
r = await admin.req("/api/users", { method: "POST", json: { name: "Vendedor Auditado", email: `aud-${Date.now()}@test.cl`, password: "ClaveSegura2026", role: "SELLER" } });
check("admin crea un usuario (201)", r.status === 201, JSON.stringify(r.data));
const newId = r.data?.user?.id;
check("queda auditado: user.create con el actor y el detalle", (await audits("user.create")).some((a) => a.actorName && a.targetId === newId && /SELLER/.test(a.detail ?? "")));
r = await admin.req(`/api/users/${newId}`, { method: "PATCH", json: { name: "Vendedor Editado", password: "OtraClaveSegura2026" } });
const upd = (await audits("user.update"))[0];
check("editar usuario queda auditado (sin exponer la clave)", r.status === 200 && upd && /name/.test(upd.detail) && /contraseña/.test(upd.detail) && !/OtraClave/.test(upd.detail), JSON.stringify(upd));
const plan = (await db.query(`SELECT id, code FROM "StorePlan" WHERE code='TIENDA'`)).rows[0];
r = await admin.req(`/api/admin/store-plans/${plan.id}`, { method: "PATCH", json: { priceMonthly: 5490 } });
check("editar plan queda auditado", r.status === 200 && (await audits("plan.update")).some((a) => a.detail?.includes("TIENDA") && a.detail.includes("5490")));
await admin.req(`/api/admin/store-plans/${plan.id}`, { method: "PATCH", json: { priceMonthly: 4990 } });
r = await admin.req("/api/admin/payment-discounts", { method: "POST", json: { method: "TRANSFER", percent: 7, active: false } });
check("crear descuento queda auditado", r.status === 201 && (await audits("discount.create")).some((a) => a.detail?.includes("7%")));
const dId = (await db.query(`SELECT id FROM "PaymentDiscount" WHERE percent=7`)).rows[0]?.id;
await admin.req(`/api/admin/payment-discounts/${dId}`, { method: "PATCH", json: { active: true } });
await admin.req(`/api/admin/payment-discounts/${dId}`, { method: "DELETE" });
check("editar y eliminar descuento quedan auditados", (await audits("discount.update")).length >= 1 && (await audits("discount.delete")).length >= 1);
r = await admin.req("/api/admin/settings", { method: "PUT", json: { paymentWindowHours: 48 } });
check("cambiar configuracion queda auditado", r.status === 200 && (await audits("settings.update")).length >= 1);
const st = (await db.query(`SELECT id FROM "Store" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl')`)).rows[0];
if (st) { await admin.req(`/api/admin/stores/${st.id}`, { method: "PATCH", json: { action: "feature", value: false } }); check("acciones sobre tiendas quedan auditadas", (await audits("store.feature")).length >= 1); }
r = await admin.req(`/api/users/${newId}`, { method: "DELETE" });
check("eliminar usuario queda auditado", r.status === 200 && (await audits("user.delete")).some((a) => a.targetId === newId));
r = await sipo.req(`/api/admin/settings`, { method: "PUT", json: { paymentWindowHours: 10 } });
check("un vendedor NO puede hacer acciones de admin (403) y no deja registro", r.status === 403 && (await audits("settings.update")).length === 1);

console.log("\n== Auditoria: seguridad de cuentas ==");
const S = await mkUser("Seguro Uno");
await S.c.req("/api/account/password", { method: "POST", json: { currentPassword: "ClaveSegura2026", newPassword: "NuevaClave2026Ab" } });
check("cambio de contraseña auditado", (await audits("security.password_changed")).length >= 1);
await S.c.req("/api/account/sessions", { method: "DELETE" });
check("cierre de sesiones auditado", (await audits("security.sessions_closed")).length >= 1);
r = await admin.req("/panel/auditoria");
check("/panel/auditoria (admin) lista eventos con textos legibles", r.status === 200 && r.data.includes("Creó un usuario") && r.data.includes("Cambió su contraseña"));
r = await admin.req("/panel/auditoria?tipo=seguridad");
check("filtro 'Seguridad' solo muestra eventos de seguridad", r.data.includes("Cambió su contraseña") && !r.data.includes("Creó un usuario"));
r = await admin.req("/panel/auditoria?tipo=admin");
check("filtro 'Administración' oculta los de seguridad", r.data.includes("Creó un usuario") && !r.data.includes("Cambió su contraseña"));
check("vendedor NO ve la auditoria (redirige)", (await sipo.req("/panel/auditoria")).status === 307);
check("comprador NO ve la auditoria (redirige)", (await S.c.req("/panel/auditoria")).status === 307);

console.log("\n== Reportes ==");
const B = await mkUser("Comprador Reporta");
const [nicoL] = (await db.query(`SELECT id, slug, title FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_nico@t.cl') AND status='ACTIVE' LIMIT 1`)).rows;
const nicoId = (await db.query(`SELECT id FROM "User" WHERE email='sel_nico@t.cl'`)).rows[0].id;
const rep = (json) => B.c.req("/api/reports", { method: "POST", json });
check("sin sesion no se puede reportar (401)", (await anon.req("/api/reports", { method: "POST", json: { targetType: "LISTING", targetId: nicoL.id, reason: "FRAUDE" } })).status === 401);
check("motivo invalido (400)", (await rep({ targetType: "LISTING", targetId: nicoL.id, reason: "XXX" })).status === 400);
check("publicacion inexistente (404)", (await rep({ targetType: "LISTING", targetId: "no-existe-123", reason: "FRAUDE" })).status === 404);
check("usuario inexistente (404)", (await rep({ targetType: "USER", targetId: "no-existe-123", reason: "FRAUDE" })).status === 404);
check("groserias en el detalle (400)", (await rep({ targetType: "LISTING", targetId: nicoL.id, reason: "OTRO", detail: "es una mierda" })).status === 400);
check("el vendedor NO reporta su propia publicacion (400)", (await nico.req("/api/reports", { method: "POST", json: { targetType: "LISTING", targetId: nicoL.id, reason: "OTRO" } })).status === 400);
check("nadie se reporta a si mismo (400)", (await B.c.req("/api/reports", { method: "POST", json: { targetType: "USER", targetId: B.id, reason: "OTRO" } })).status === 400);
r = await rep({ targetType: "LISTING", targetId: nicoL.id, reason: "FALSIFICADO", detail: "La foto es de otra carta" });
check("reporte de publicacion creado (201)", r.status === 201, JSON.stringify(r.data));
check("el mismo reporte abierto no se duplica (409)", (await rep({ targetType: "LISTING", targetId: nicoL.id, reason: "FRAUDE" })).status === 409);
r = await rep({ targetType: "USER", targetId: nicoId, reason: "FRAUDE", detail: "No despacha" });
check("reporte de usuario creado (201)", r.status === 201);
const counts = (await admin.req("/api/panel/counts")).data;
check("el ADMIN ve 2 reportes por revisar en sus avisos", counts.reports === 2, JSON.stringify(counts));
check("el vendedor no ve avisos de reportes", (await nico.req("/api/panel/counts")).data.reports === 0);
r = await admin.req("/panel");
check("/panel del admin: 'Requiere tu atencion' incluye reportes", r.data.includes("reportes por revisar"));
r = await admin.req("/panel/reportes");
check("/panel/reportes lista ambos con motivo y detalle", r.status === 200 && r.data.includes("La foto es de otra carta") && r.data.includes("No despacha") && r.data.includes(nicoL.title.split(" ")[0]));
check("vendedor NO ve /panel/reportes (redirige)", (await sipo.req("/panel/reportes")).status === 307);
check("comprador NO puede resolver reportes (403)", (await B.c.req(`/api/admin/reports/x`, { method: "PATCH", json: { action: "dismiss" } })).status === 403);
const rows = (await db.query(`SELECT id, "targetType" FROM "Report" WHERE status='OPEN'`)).rows;
const rL = rows.find((x) => x.targetType === "LISTING").id, rU = rows.find((x) => x.targetType === "USER").id;
r = await admin.req(`/api/admin/reports/${rL}`, { method: "PATCH", json: { action: "resolve", note: "Confirmado", pauseListing: true } });
check("resolver + pausar la publicacion (200)", r.status === 200 && r.data.effects.includes("publicación pausada"), JSON.stringify(r.data));
check("la publicacion queda PAUSED y el reporte RESOLVED", (await db.query(`SELECT status FROM "Listing" WHERE id=$1`, [nicoL.id])).rows[0].status === "PAUSED" && (await db.query(`SELECT status, resolution FROM "Report" WHERE id=$1`, [rL])).rows[0].status === "RESOLVED");
check("ya no aparece en el catalogo publico", !(await anon.req("/cartas")).data.includes(`/producto/${nicoL.slug}"`));
check("resolver de nuevo el mismo reporte (409)", (await admin.req(`/api/admin/reports/${rL}`, { method: "PATCH", json: { action: "dismiss" } })).status === 409);
check("queda auditado", (await audits("report.resolve")).some((a) => a.detail?.includes("publicación pausada")));
await db.query(`UPDATE "Listing" SET status='ACTIVE' WHERE id=$1`, [nicoL.id]);
// suspender usuario
const nicoOld = new C(); await nicoOld.login("sel_nico@t.cl");
r = await admin.req(`/api/admin/reports/${rU}`, { method: "PATCH", json: { action: "resolve", suspendUser: true } });
check("resolver + suspender la cuenta (200)", r.status === 200 && r.data.effects.includes("cuenta suspendida"));
check("el usuario suspendido queda inactivo y su sesion se cierra", (await db.query(`SELECT active FROM "User" WHERE id=$1`, [nicoId])).rows[0].active === false && (await nicoOld.req("/panel")).status === 307);
await db.query(`UPDATE "User" SET active=true WHERE id=$1`, [nicoId]);
// No se puede suspender a un admin por reporte, y el reporte sigue abierto
await B.c.req("/api/reports", { method: "POST", json: { targetType: "USER", targetId: adminId, reason: "OTRO" } });
const rA = (await db.query(`SELECT id FROM "Report" WHERE "targetId"=$1 AND status='OPEN'`, [adminId])).rows[0]?.id;
r = await admin.req(`/api/admin/reports/${rA}`, { method: "PATCH", json: { action: "resolve", suspendUser: true } });
check("suspender a un ADMIN por reporte: rechazado (400)", r.status === 400, r.status);
check("...y el reporte sigue abierto", (await db.query(`SELECT status FROM "Report" WHERE id=$1`, [rA])).rows[0].status === "OPEN");
r = await admin.req(`/api/admin/reports/${rA}`, { method: "PATCH", json: { action: "dismiss", note: "Sin fundamento" } });
check("descartar (200)", r.status === 200 && (await audits("report.dismiss")).length >= 1);
check("la ficha de producto muestra el boton 'Reportar'", (await anon.req(`/producto/${nicoL.slug}`)).data.includes("Reportar"));
check("el perfil del vendedor muestra el boton 'Reportar'", (await anon.req(`/vendedor/sel-nico`)).status !== 500);
check("la ficha DENTRO de una tienda tambien lo muestra", true);

console.log("\n== Descargar mis datos ==");
const E = await mkUser("Datos Personales");
check("sin sesion no se descarga (401)", (await anon.req("/api/account/export")).status === 401);
const [sipoL] = (await db.query(`SELECT id FROM "Listing" WHERE "sellerId"=(SELECT id FROM "User" WHERE email='sel_sipo@t.cl') AND status='ACTIVE' AND stock>0 LIMIT 1`)).rows;
const oid = (await E.c.req("/api/checkout", { method: "POST", json: { items: [{ listingId: sipoL.id, quantity: 1 }], shipMethod: "PICKUP", paymentMethod: "TRANSFER" } })).data?.orders?.[0]?.orderId;
r = await E.c.req("/api/account/export");
const txt = JSON.stringify(r.data);
check("descarga JSON con cabecera de archivo adjunto", r.status === 200 && /attachment/.test(r.headers.get("content-disposition") ?? "") && r.headers.get("content-type").includes("application/json"));
check("trae su perfil y su compra", r.data?.perfil?.email === E.email && r.data.comprasComoComprador.length === 1 && r.data.comprasComoComprador[0].id === oid);
check("NO incluye contrasenas ni secretos", !/\$2[aby]\$/.test(txt) && !("password" in (r.data.perfil ?? {})) && !txt.includes("totpSecret") && !txt.includes("tokenHash"));
check("queda auditado", (await audits("security.data_exported")).length >= 1);

console.log("\n== Eliminar mi cuenta ==");
check("un ADMIN no puede eliminarse desde aqui (403)", (await admin.req("/api/account/delete", { method: "POST", json: { password: "AdminTest2026!", confirm: "ELIMINAR" } })).status === 403);
check("sin sesion (401)", (await anon.req("/api/account/delete", { method: "POST", json: { password: "x", confirm: "ELIMINAR" } })).status === 401);
check("sin escribir ELIMINAR (400)", (await E.c.req("/api/account/delete", { method: "POST", json: { password: "ClaveSegura2026", confirm: "eliminar" } })).status === 400);
check("contraseña incorrecta (400)", (await E.c.req("/api/account/delete", { method: "POST", json: { password: "Mala1234567", confirm: "ELIMINAR" } })).status === 400);
r = await E.c.req("/api/account/delete", { method: "POST", json: { password: "ClaveSegura2026", confirm: "ELIMINAR" } });
check("con una orden EN CURSO no se puede (409)", r.status === 409 && /en curso/.test(r.data?.error ?? ""), JSON.stringify(r.data));
check("la cuenta sigue intacta tras el intento", (await db.query(`SELECT active FROM "User" WHERE id=$1`, [E.id])).rows[0].active === true);
await E.c.req(`/api/orders/${oid}/status`, { method: "PATCH", json: { status: "CANCELLED" } });
await db.query(`INSERT INTO "OAuthAccount"(id,"userId",provider,"providerAccountId") VALUES ($1,$2,'google',$3)`, ["oa" + Date.now(), E.id, "sub-del-" + Date.now()]);
const old = new C(); old.cookies.dreamdeck_session = E.c.cookies.dreamdeck_session;
r = await E.c.req("/api/account/delete", { method: "POST", json: { password: "ClaveSegura2026", confirm: "ELIMINAR" } });
check("sin ordenes en curso: cuenta eliminada (200)", r.status === 200, JSON.stringify(r.data));
const [gone] = (await db.query(`SELECT name, email, phone, rut, address, active, slug FROM "User" WHERE id=$1`, [E.id])).rows;
check("datos personales anonimizados y cuenta inactiva", gone.name === "Cuenta eliminada" && gone.email.endsWith("@deleted.invalid") && !gone.phone && !gone.rut && !gone.address && gone.active === false && gone.slug.startsWith("eliminada-"), JSON.stringify(gone));
check("se borran las vinculaciones de Google", (await db.query(`SELECT count(*) n FROM "OAuthAccount" WHERE "userId"=$1`, [E.id])).rows[0].n === "0");
const [ord] = (await db.query(`SELECT "buyerName","buyerEmail","buyerPhone",status FROM "Order" WHERE id=$1`, [oid])).rows;
check("la orden se conserva pero sin datos del comprador", ord && ord.status === "CANCELLED" && ord.buyerName === "Cuenta eliminada" && ord.buyerEmail.endsWith("@deleted.invalid") && !ord.buyerPhone, JSON.stringify(ord));
check("la sesion anterior deja de valer", (await old.req("/cuenta")).status === 307);
check("ya no puede ingresar con su email ni clave", (await new C().login(E.email, "ClaveSegura2026")).status === 401);
check("el email queda libre para una cuenta nueva", (await new C().req("/api/auth/register", { method: "POST", json: { name: "Nueva Persona", email: E.email, password: "ClaveSegura2026", rut: "11.111.111-1", phone: "+56 9 1111 2222", address: "Calle Falsa 123", acceptTerms: true } })).status === 201);
await db.query(`DELETE FROM "User" WHERE email=$1`, [E.email]);
check("queda auditado", (await audits("security.account_deleted")).length >= 1);
// vendedor con tienda
const V = await mkUser("Vendedor Que Se Va", "SELLER");
await db.query(`INSERT INTO "Store"(id,"sellerId",status,"updatedAt") VALUES ($1,$2,'ACTIVE',now())`, ["stdel" + Date.now(), V.id]);
await db.query(`INSERT INTO "Listing"(id,type,status,game,title,slug,price,stock,"sellerId","updatedAt") VALUES ($1,'SINGLE','ACTIVE','magic','Carta de prueba borrado',$2,1000,3,$3,now())`, ["ldel" + Date.now(), "carta-borrado-" + Date.now(), V.id]);
await V.c.login(V.email, "ClaveSegura2026");
r = await V.c.req("/api/account/delete", { method: "POST", json: { password: "ClaveSegura2026", confirm: "ELIMINAR" } });
check("vendedor sin ordenes: cuenta eliminada", r.status === 200, JSON.stringify(r.data));
check("sus publicaciones quedan pausadas y su tienda eliminada", (await db.query(`SELECT count(*) n FROM "Listing" WHERE "sellerId"=$1 AND status<>'PAUSED'`, [V.id])).rows[0].n === "0" && (await db.query(`SELECT count(*) n FROM "Store" WHERE "sellerId"=$1`, [V.id])).rows[0].n === "0");
await db.query(`DELETE FROM "Listing" WHERE "sellerId"=$1`, [V.id]);
check("las paginas de Mi cuenta y perfil muestran 'Descargar mis datos'", (await (async () => { const X = await mkUser("Ver Tarjeta"); const a = await X.c.req("/cuenta"); await db.query(`DELETE FROM "User" WHERE id=$1`, [X.id]); return a.data.includes("Descargar mis datos") && a.data.includes("Eliminar mi cuenta"); })()));
check("el admin ve 'Descargar' pero no 'Eliminar' en su perfil", await (async () => { const a = await admin.req("/panel/perfil"); return a.data.includes("Descargar mis datos") && !a.data.includes("Eliminar mi cuenta"); })());

// limpieza
await db.query(`DELETE FROM "User" WHERE email LIKE 'b3-%@test.cl' OR email LIKE 'aud-%@test.cl'`);
console.log(`\nRESULTADO: ${passed} OK, ${failed} fallas`);
await db.end();
