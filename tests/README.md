# Pruebas de punta a punta

Ocho baterías que recorren el sitio como lo haría una persona (compras, pagos, tiendas, soporte, seguridad,
correos, SEO…): **469 comprobaciones**. Viven en `tests/e2e/`.

| Batería | Qué cubre |
|---|---|
| `tiendas.mjs` | Planes, pago de membresía, comprobantes privados, personalización, tienda pública, visitas y QR |
| `soporte.mjs` | Tickets, permisos, avisos y contadores del panel |
| `admin-y-ficha.mjs` | Admin con plan Pro incluido, ficha de producto dentro de la tienda |
| `legal-y-planes.mjs` | Páginas legales, aceptación de términos, planes base |
| `seo.mjs` | robots, sitemap, metadatos, datos estructurados |
| `ordenes-y-cuenta.mjs` | Correos de órdenes, seguimiento de envío, autocompra, cambio de clave y sesiones |
| `verificacion-2fa-google.mjs` | Confirmación de email, 2FA (TOTP), login con Google (con un Google falso que valida PKCE), CSRF |
| `auditoria-reportes-datos.mjs` | Auditoría, reportes, descargar datos, eliminar cuenta |
| `flujo-completo.mjs` | Ciclo de una venta: publicar, cupón, compra, chat de la orden, pago, despacho, recepción, reseña y cancelación con devolución de stock |
| `contacto-y-mercado.mjs` | Contacto público sin cuenta, soporte del comprador, análisis de mercado y registro de búsquedas con consentimiento |
| `seguridad.mjs` | Token y secretos fuera del HTML/JSON/JavaScript, quién compra y quién publica, datos ajenos, tokens falsificados, cierre de sesión, CSRF, cabeceras y fuerza bruta |

## Regresiones sin base de datos

`npm run test:regression` ejecuta los handlers reales con adaptadores de base de datos controlados. Cubre idempotencia, cambios de total, datos bancarios, autorización de analítica, consentimiento, vencimiento de órdenes y declaración de reembolsos. No demuestra conectividad ni concurrencia real de PostgreSQL; las pruebas e2e de abajo requieren una base aislada.

## Cómo ejecutarlas

Necesitas **una base PostgreSQL SOLO para pruebas** (nunca la de producción). Los datos de prueba se cargan solos,
y `fixtures.mjs` se niega a correr contra algo que no sea local.

```bash
# 1) Una sola vez: driver de Postgres para las pruebas
npm i -D pg

# 2) Crea las tablas en tu base de pruebas y carga los datos
export TEST_DB_URL="postgresql://postgres:postgres@127.0.0.1:5432/wctcg_test"
DATABASE_URL=$TEST_DB_URL DIRECT_URL=$TEST_DB_URL npx prisma db push
node tests/e2e/fixtures.mjs

# 3) Enciende el sitio apuntando a esa base (deja el log en un archivo: las pruebas de correo lo leen)
DATABASE_URL=$TEST_DB_URL DIRECT_URL=$TEST_DB_URL \
NEXT_PUBLIC_SITE_URL=http://localhost:3011 CRON_SECRET=testcron TEST_FORCE_MAIL=1 \
GOOGLE_CLIENT_ID=testid GOOGLE_CLIENT_SECRET=testsecret GOOGLE_TOKEN_URL=http://localhost:3999/token \
npx next dev -p 3011 > dev.log 2>&1 &

# 4) Corre todo
BASE_URL=http://localhost:3011 DEV_LOG=./dev.log CRON_SECRET=testcron node tests/e2e/run-all.mjs
```

O una sola batería: `node tests/e2e/seo.mjs`.

## Cosas que conviene saber

- **`seguridad.mjs` debe correr contra una compilación de producción** (`next build` + `next start`). En `next dev`, React agrega información de depuración al HTML que incluye los valores de las cookies leídas en el servidor; eso no existe en producción y la batería lo marcaría como falla.

- Los correos no se envían de verdad: sin `RESEND_API_KEY` quedan en el log del servidor y las pruebas los leen de
  ahí (`DEV_LOG`). `TEST_FORCE_MAIL=1` (solo en desarrollo) hace que el sitio se comporte como si el correo estuviera
  configurado, para probar que se exige confirmar el email.
- `GOOGLE_TOKEN_URL` (solo en desarrollo) apunta el intercambio de código a un servidor falso que levanta la propia
  batería en el puerto 3999. En producción esa variable se ignora.
- Las baterías modifican y limpian datos de la base de pruebas; puedes volver a ejecutarlas cuando quieras.
- El CI de GitHub (`.github/workflows/ci.yml`) solo revisa tipos y que el sitio compile, porque estas pruebas
  necesitan una base de datos.
