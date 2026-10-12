# Activación de analítica y respaldo semanal

## Despliegue

1. Configura las conexiones reales `DATABASE_URL` y `DIRECT_URL`. No uses los valores de ejemplo.
2. Ejecuta `npx prisma generate` y revisa/aplica el esquema con `npm run db:push` en el entorno de destino. Se agregan UsageEvent, UsageReport, CheckoutRequest y campos opcionales en Order. El build también aplica el esquema y activa RLS en las tres tablas privadas; no uses `--accept-data-loss`. RLS impide consultar estas tablas con las claves públicas anon/authenticated de Supabase. La conexión del servidor necesita ser propietaria de las tablas o un rol autorizado con BYPASSRLS; nunca uses ese rol en el navegador. Si aplicas el esquema con otra herramienta, ejecuta también `npm run db:protect`. Un fallo en la protección detiene el build.
3. Configura `CRON_SECRET` en Vercel, despliega y comprueba `/api/health`.
4. Con una cuenta ADMIN abre `/panel/analitica`. Una cuenta SELLER no debe poder entrar y `/api/admin/analytics` debe rechazar usuarios sin privilegios.
5. El cron `/api/cron/weekly-report` corre los lunes a las 10:00 UTC, cierra la semana anterior (lunes a domingo UTC) y limpia eventos mayores de 90 días e informes mayores de 52 semanas. Verifica la ejecución en Vercel. No se envían informes por correo.

El informe no es una copia de la base. Las visitas empiezan a registrarse desde este despliegue y solo con consentimiento. Los registros y pagos vienen de los datos reales existentes. No se inventa un histórico de navegación. Las sesiones cambian de identificador cada día y no equivalen a personas únicas. Los administradores que naveguen por la tienda con consentimiento pueden estar incluidos; el panel no envía visitas. El endpoint público usa límites de frecuencia como defensa básica; las cifras no son una medición antifraude de facturación.

## Respaldo fuera de la base de datos

El workflow `Respaldo semanal` se ejecuta los lunes a las 10:30 UTC en la rama predeterminada y admite ejecución manual. Para activarlo, subir estos cambios al repositorio y configurar en Settings → Secrets and variables → Actions:

- `BACKUP_DATABASE_URL`: conexión PostgreSQL del **session pooler, puerto 5432**, con permisos de lectura suficientes sobre todas las tablas del esquema public. No usar el transaction pooler 6543 para pg_dump. Si la clave incluye símbolos, codificarla para URL. Usar una cuenta dedicada cuando sea posible.
- `BACKUP_PASSPHRASE`: secreto aleatorio de al menos 32 caracteres, guardado también en un gestor de contraseñas externo. Sin él no se puede recuperar la copia. Conservar la clave antigua si se rota durante los 90 días de retención.

Se respalda el esquema `public` completo, incluidos los binarios de Upload donde esta app almacena comprobantes e imágenes. No incluye archivos de Supabase Storage, esquemas auth/storage, roles del servidor, configuración de Vercel ni secretos externos. La aplicación usa autenticación propia en public.User. Si se agregan otros esquemas o servicios se debe ampliar este plan.

Usa pg_dump 17 (requiere servidor PostgreSQL 17 o anterior), una instantánea consistente, validación del índice con pg_restore, cifrado AES-256-CBC con PBKDF2 y 600.000 iteraciones y un checksum SHA-256. Solo se sube el archivo cifrado. La lista de tablas y el dump sin cifrar se eliminan del runner. El checksum detecta corrupción accidental; no reemplaza una firma autenticada. Restringir acceso al repositorio, secretos y artefactos. Retención de artefactos: hasta 90 días, sujeta a los límites del repositorio y a la cuota de GitHub Actions.

**La programación en el código no prueba que esté activa.** Ejecuta manualmente el workflow, confirma que queda verde y descarga el artefacto. GitHub puede desactivar tareas programadas en repositorios públicos tras períodos prolongados sin actividad y los horarios pueden retrasarse. Habilita las notificaciones de fallos del workflow y comprueba semanalmente la última copia; revisa también que Supabase no esté pausado. El panel no afirma que exista una copia si no se ha verificado.

## Recuperación comprobada

Ensayar la recuperación sobre una base aislada, nunca sobre producción:

```bash
sha256sum -c database.dump.enc.sha256
# Lee la clave sin imprimirla ni guardarla en el historial del shell.
read -rs BACKUP_PASSPHRASE
export BACKUP_PASSPHRASE
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in database.dump.enc -out database.dump -pass env:BACKUP_PASSPHRASE
unset BACKUP_PASSPHRASE
pg_restore --list database.dump
# Configura PGDATABASE con la conexión a una base NUEVA de recuperación.
pg_restore --no-owner --no-acl --exit-on-error --single-transaction --dbname="$PGDATABASE" database.dump
```

Comparar número de usuarios, órdenes, publicaciones y archivos; comprobar login, catálogo y acceso privado a comprobantes. Registrar fecha y resultado del ensayo. Reaplicar solicitudes de eliminación de datos posteriores al respaldo antes de abrir el servicio recuperado. Una lista válida de pg_restore no demuestra por sí sola una restauración completa.

## Datos legales por completar

`NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_RUT`, `NEXT_PUBLIC_LEGAL_ADDRESS` y `NEXT_PUBLIC_CONTACT_EMAIL` deben identificar al responsable real. No se inventan datos de empresa. Las políticas describen transferencia directa, efectivo y envío por pagar; no prometen cobro con tarjeta, envío gratuito ni reembolso automático.

Fuentes revisadas el 11 de octubre de 2026:
- SERNAC: https://www.sernac.gov.cl/portal/604/w3-propertyvalue-20982.html
- Ley 21.719 y entrada en vigor: https://www.bcn.cl/leychile/Navegar?idNorma=1209272

Revisar los textos con el responsable del negocio o asesor legal, especialmente su calidad de intermediario/proveedor, identidad, mecanismos de reclamo y plazos comerciales reales.
