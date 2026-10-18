# Interfaz y privacidad — 17 de octubre de 2026

## Cambios

- Inicio con superficie clara, búsqueda directa, accesos por juego y vitrina animada sobre fondo oscuro.
- Panel con navegación diferenciada, estado de página accesible y superficies de lectura claras.
- Enlaces para saltar al contenido, formularios móviles legibles, movimiento reducido y contenido Reveal visible sin JavaScript.
- Pantalla recuperable de error para fallos de carga.
- Consentimiento opcional de estadísticas, rechazo de igual prominencia, retiro inmediato, control de versión y respeto por DNT/GPC.
- `ConsentRecord`: historial separado de términos y estadísticas, fecha del servidor, versión, declaración, origen y cuenta o identificador aleatorio. Sin IP ni user-agent.
- Registro atómico junto con creación de cuenta y checkout; Google exige casilla y transporta la versión en el estado firmado.
- `/panel/consentimientos`: consulta exclusiva del administrador, paginación y exportación JSON en lotes de 1.000 con `nextCursor`. Descarga adicional de campos históricos de cuentas.
- Copia de consentimientos propios en exportación de cuenta. Retención de eventos de 24 meses con eliminación en el cron semanal. No existen rutas para editar eventos.
- RLS de la tabla nueva en el proceso de despliegue; políticas y versión legal actualizadas.

## Verificación realizada

- 21 pruebas de regresión aprobadas: compras, reservas, idempotencia, permisos, consentimiento, versiones antiguas, rechazo anónimo, DNT/GPC, abuso y fallo de persistencia.
- Validación de esquema Prisma y TypeScript.
- Compilación optimizada Next.js.
- 37 comprobaciones HTTP de lectura: 18 rutas públicas y SEO, 17 redirecciones de rutas privadas y dos denegaciones de exportaciones para visitantes.
- Inspección visual del inicio a ancho de escritorio y 390 px, menú móvil y mensaje de fallo de persistencia del consentimiento.

## Límites y puesta en producción

El `.env` local contiene una conexión PostgreSQL inválida. Las rutas públicas se comprobaron con sus estados vacíos/fallback; esto no acredita lecturas reales, ventas, correo, Google real ni flujos de administrador autenticado. Las baterías e2e requieren una base de pruebas aislada según `tests/README.md`. No se ejecutaron fixtures ni cambios sobre datos de producción.

`npm run build` en Vercel aplica el esquema y activa RLS antes de compilar. Se necesita `DATABASE_URL` y `DIRECT_URL` válidas con permisos adecuados. No usar `--accept-data-loss`.

El historial es evidencia técnica de una decisión, no una firma electrónica certificada ni garantía de cumplimiento. Completar los datos reales del responsable (`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_RUT`, `NEXT_PUBLIC_LEGAL_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL`) y validar texto y plazo de conservación con asesoría jurídica. Conservar el commit que contiene cada versión publicada de los documentos; incrementar ambas versiones al cambiar el consentimiento de cookies. Los respaldos descargados requieren acceso restringido y la misma política de conservación.

Referencia legal consultada: [Ley 21.719, Biblioteca del Congreso Nacional](https://www.bcn.cl/leychile/navegar?i=1209272), con vigencia diferida al 1 de diciembre de 2026.

## Comandos

```text
npm run test:regression
npm run typecheck
npx prisma validate
npx next build
node tests/smoke-public.mjs
```

El smoke usa por defecto `http://127.0.0.1:3012`; permite `BASE_URL`. Solo realiza lecturas y no sustituye las pruebas e2e transaccionales.
