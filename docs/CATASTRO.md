# Catastro de Win Condition TCG

Estado al **21 de septiembre de 2026**, tras cerrar los bloques de seguridad, cuentas y calidad. Todo lo de este
documento se verificó en el código y con pruebas, no de memoria.
Leyenda: ✅ existe y funciona · 🟡 existe pero depende de que configures algo · ❌ no existe.

---

## 1. Resumen

Win Condition TCG es un **marketplace** de cartas TCG (Magic, Pokémon, One Piece y Mitos y Leyendas) donde los
pagos son **transferencias directas** entre comprador y vendedor. La plataforma no maneja el dinero de las ventas:
reserva el stock, genera el código de pago, guarda el comprobante y da chat, reseñas y herramientas. El único cobro
propio son las **membresías de tienda**.

| Área | Estado |
|---|---|
| Catálogo, búsqueda, carta con vendedores, mercado e historial de precios | ✅ |
| Compra con reserva de stock, transferencia, comprobante privado, chat, reseñas | ✅ |
| Panel del vendedor (publicar, carga masiva, órdenes, cupones, perfil, QR) | ✅ |
| Tiendas premium (planes, pago, personalización, estadísticas, vitrina) | ✅ |
| Soporte para tiendas, avisos y campana del panel | ✅ |
| SEO técnico y páginas de marketing | ✅ |
| Páginas legales (términos, privacidad, devoluciones, quiénes somos) | ✅ (falta la revisión de un abogado) |
| Correos de órdenes, recuperar clave, soporte y confirmar email | 🟡 listos; salen de verdad al configurar Resend |
| Login con Google | 🟡 listo; se activa al poner las credenciales de Google |
| Seguridad de cuenta: cambiar clave, cerrar sesiones, confirmar email, 2FA, CSRF | ✅ |
| Auditoría, reportes, descargar datos y eliminar cuenta | ✅ |
| Pruebas automáticas (e2e), CI, salud del sitio y registro de errores | ✅ |

**Veredicto:** el sitio está **completo para lanzar**. Lo que falta ya no es código: son **cuentas y claves que
solo tú puedes crear** (correo, Google, variables de Vercel) y decisiones tuyas (sección 5).

---

## 2. Planes de tienda

Los precios son los de partida y **los editas tú** en Panel → Tiendas premium → Planes y precios. En producción, si
ya se crearon planes con otros valores, hay que cambiarlos ahí: los valores por defecto solo se usan cuando la base
no tiene planes.

| | **Perfil gratis** | **Tienda** | **Tienda Pro** |
|---|:-:|:-:|:-:|
| Precio mensual | $0 | **$4.990** | **$7.990** |
| Publicar y vender (sin límite de publicaciones) | ✅ | ✅ | ✅ |
| Sin comisión por venta | ✅ | ✅ | ✅ |
| Perfil con link corto y QR para compartir | ✅ | ✅ | ✅ |
| Tienda propia (`/tienda/tu-nombre`) con menú y buscador propios | — | ✅ | ✅ |
| Banner, logo, color de marca, barra de anuncio, redes | — | ✅ | ✅ |
| QR con tu logo al centro | — | ✅ | ✅ |
| Insignia "Tienda verificada" | — | ✅ | ✅ |
| Productos destacados arriba del catálogo | — | hasta 6 | hasta 12 |
| Estadísticas | — | básicas (visitas, QR, ventas) | completas (gráfico diario, más vendidos, ingresos 30 d) |
| Aparecer en "Tiendas destacadas" del inicio | — | — | ✅ (si el admin la destaca) |
| Soporte directo con el administrador (tickets) | — | ✅ | ✅ |

Cómo se contrata: el vendedor elige plan y 1, 3, 6 o 12 meses → transfiere a la cuenta del admin con un código
`TI-XXXXXXXX` → sube el comprobante → el admin aprueba → la tienda queda activa. **No hay renovación automática.**
Si vence, la tienda deja de mostrarse y el perfil normal sigue; los datos se conservan.

---

## 3. Qué puede hacer cada perfil

| Capacidad | Visitante | Comprador | Vendedor gratis | Tienda / Pro | Administrador |
|---|:-:|:-:|:-:|:-:|:-:|
| Navegar catálogo, buscar, filtrar (juego, tipo, idioma, estado, precio, "cerca mío") | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver carta con todos sus vendedores, mercado (mín/mediana/máx) e historial | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver perfiles, tiendas, noticias y páginas legales | ✅ | ✅ | ✅ | ✅ | ✅ |
| Usar el carrito (queda en el navegador) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear cuenta (con clave o con Google, aceptando términos) | ✅ | — | — | — | — |
| Comprar (checkout con cupón y descuento por método de pago) | — | ✅ | ✅ (no sus propias publicaciones) | ✅ (ídem) | ✅ (ídem) |
| Subir comprobante, chatear en la orden, cancelar si está pendiente | — | ✅ | ✅ | ✅ | ✅ |
| Confirmar recepción, ver el seguimiento del envío y dejar reseña | — | ✅ | ✅ | ✅ | ✅ |
| Reportar una publicación o a un vendedor | — | ✅ | ✅ | ✅ | ✅ |
| Cambiar contraseña, cerrar sesiones, activar 2FA | — | ✅ | ✅ | ✅ | ✅ |
| Descargar mis datos y eliminar mi cuenta | — | ✅ | ✅ | ✅ | descargar (eliminar no) |
| Solicitar ser vendedor | — | ✅ | — | — | — |
| Panel de vendedor (resumen, avisos) | — | — | ✅ | ✅ | ✅ |
| Publicar singles, sellados y mazos; editar, pausar, borrar | — | — | ✅ | ✅ | ✅ (y a nombre de otros) |
| Carga masiva (Magic, Pokémon, One Piece) | — | — | ✅ | ✅ | ✅ |
| Gestionar órdenes: confirmar pago, marcar enviada (courier y N°), cancelar | — | — | ✅ | ✅ | ✅ (todas) |
| Crear cupones propios | — | — | ✅ | ✅ | ✅ |
| Perfil de vendedor: cuenta bancaria, región, envío/retiro, link y QR | — | — | ✅ | ✅ | ✅ |
| Responder reseñas | — | — | ✅ | ✅ | ✅ |
| Tienda propia personalizable + estadísticas | — | — | — | ✅ | ✅ (Pro incluido) |
| Abrir tickets de soporte | — | — | — | ✅ | — (los atiende) |
| Aprobar solicitudes de vendedor y gestionar usuarios | — | — | — | — | ✅ |
| Aprobar pagos de membresía; regalar, suspender o cortar planes; destacar tiendas | — | — | — | — | ✅ |
| Editar planes y precios, ventana de pago, descuentos por método de pago | — | — | — | — | ✅ |
| Resolver reportes (pausar publicación o suspender cuenta) | — | — | — | — | ✅ |
| Ver la auditoría de acciones y de seguridad | — | — | — | — | ✅ |
| Bandeja de soporte, campana y contadores de avisos | — | — | (solo lo suyo) | (solo lo suyo) | ✅ |

Notas:
- El administrador tiene **siempre el plan Pro incluido**, sin vencimiento, y no se le puede suspender ni cortar.
- Un vendedor también puede comprar como cualquier comprador, salvo sus propias publicaciones.
- Sin plan vigente, un vendedor **no puede personalizar su tienda ni abrir tickets** (lo verás bloqueado con el motivo).
- Confirmar el email solo se exige cuando el correo real está configurado y a cuentas nuevas; las antiguas quedan exentas.

---

## 4. Seguridad y cuentas

| Tema | Estado |
|---|---|
| Contraseñas con bcrypt (12 rondas); política de 10+ caracteres con mayúscula, minúscula y número | ✅ |
| Sesión en cookie `httpOnly`, `secure`, `sameSite=lax` (8 horas, o 30 días con "Recordar sesión") | ✅ |
| Cambiar contraseña desde Mi cuenta (pide la actual) y cerrar sesión en otros dispositivos | ✅ |
| Cambiar o recuperar la clave, o suspender a alguien, **invalida sus otras sesiones** | ✅ |
| Recuperar contraseña: link de un solo uso, vence en 1 hora, token guardado con hash | 🟡 el correo sale al configurar Resend |
| Confirmar el email al registrarse (link de 24 h, un solo uso) | 🟡 se exige al configurar Resend |
| Verificación en dos pasos (TOTP): app autenticadora, 8 códigos de respaldo, sin reutilizar códigos, secreto cifrado | ✅ (recomendada al admin) |
| Login con Google (OAuth con PKCE y `state`; verifica emisor, audiencia, vencimiento y email verificado) | 🟡 falta poner las credenciales |
| Defensa contra pre-secuestro: al vincular Google a una cuenta con email sin confirmar, se anula su clave y sesiones | ✅ |
| CSRF: las peticiones que modifican datos deben venir del mismo origen | ✅ |
| Límite de intentos: login, recuperar clave, registro, 2FA, cambio de clave, reportes, tickets, subidas, etc. | ✅ |
| Permisos por rol verificados en cada API; el rol se relee de la base (no del token) | ✅ |
| Comprobantes de pago privados (solo las partes y el admin); subidas validadas por firma real del archivo | ✅ |
| Cabeceras: CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy, Referrer-Policy | ✅ |
| No se puede comprar lo propio (evita inflar reseñas) | ✅ |
| Registro de auditoría: acciones del admin y cambios de seguridad de las cuentas | ✅ |
| Reportes de publicaciones y vendedores con bandeja de moderación | ✅ |
| Descargar mis datos (JSON) y eliminar mi cuenta (anonimiza; se bloquea con órdenes en curso) | ✅ |
| Aceptación de términos guardada con fecha y versión | ✅ |
| `GET /api/health` para monitores de disponibilidad y registro de errores en JSON | ✅ |
| CSP estricta (hoy permite `unsafe-inline` y `unsafe-eval` porque Next.js los pide por defecto) | 🟡 mejora futura con nonces |

---

## 5. Lo que falta, y quién lo hace

Ya no queda código bloqueante. Lo pendiente son **cuentas, claves y decisiones tuyas**.

### A. Antes de abrir al público (todo tuyo)
| # | Tarea | Tiempo |
|---|---|:-:|
| 1 | **Correo real**: crear cuenta en Resend, verificar tu dominio y poner `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en Vercel. Con esto empiezan a salir los correos de órdenes, la recuperación de clave y la confirmación de email | 30 min |
| 2 | **Variables de Vercel**: `NEXT_PUBLIC_SITE_URL` (dominio real), `AUTH_SECRET` (largo y único), `CRON_SECRET` y los datos legales opcionales (ver sección 6) | 15 min |
| 3 | **Cambiar las credenciales del admin** si siguen las de fábrica (`admin@dreamdecktcg.cl` y la clave del seed) y **activar el 2FA** de esa cuenta en Panel → Mi perfil | 10 min |
| 4 | Cargar los **datos bancarios del admin** (Panel → Mi perfil): sin ellos nadie puede pagar una membresía | 5 min |
| 5 | **Google**: crear el ID de cliente OAuth en Google Cloud y poner `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`; el botón aparece solo | 20 min |
| 6 | **Revisión de un abogado** de términos, privacidad y devoluciones | externo |
| 7 | Registrar el sitio en **Google Search Console** y enviar `/sitemap.xml` | 15 min |
| 8 | Confirmar los **precios de los planes** en el panel (y que las membresías no se reembolsan una vez activas) | 5 min |

### B. Recomendado en las primeras semanas
| # | Tarea | Quién |
|---|---|:-:|
| 9 | Un monitor de disponibilidad (UptimeRobot, Better Stack…) apuntando a `https://tu-dominio/api/health` | 🧑 |
| 10 | Conectar Sentry (o similar) para recibir alertas de errores; el registro JSON ya está | 🤝 |
| 11 | Confirmar el plan de Supabase y sus **backups** | 🧑 |
| 12 | Boleta o factura a los vendedores por la membresía (trámite tributario) | 🧑 |

### C. Cuando crezca el uso (código futuro)
| # | Tarea | Nota |
|---|---|---|
| 13 | Mover las imágenes subidas de la base a un almacenamiento de archivos (Supabase Storage o Vercel Blob) | Hoy comprobantes, logos y banners viven en la base; el plan gratis de Supabase tiene 500 MB. |
| 14 | Correo por cada mensaje del chat de una orden y preferencias de notificación | Hoy se avisa por los eventos importantes de la orden. |
| 15 | Favoritos y alertas de precio de cartas | Crecimiento. |
| 16 | Endurecer la CSP (sin `unsafe-inline`/`unsafe-eval`) | Mejora de seguridad. |
| 17 | Proveedores de despacho integrados (Starken, Blue Express) | Descartado por ahora; el vendedor ingresa courier y N° a mano. |

---

## 6. Configuración de Vercel

| Variable | Para qué | Estado |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Base de datos Supabase | ✅ ya están |
| `AUTH_SECRET` | Firma de sesiones y cifrado del 2FA (mínimo 32 caracteres; **si lo cambias se cierran todas las sesiones y se pierden los 2FA**) | verificar |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Administrador inicial | **cambiar los de fábrica** |
| `NEXT_PUBLIC_SITE_URL` | Sitemap, canonicals, imágenes al compartir | **pendiente** |
| `CRON_SECRET` | Protege los crons (noticias y vencimiento de órdenes) | verificar |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Correos | **pendiente** |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Login con Google (URI de redirección: `https://TU-DOMINIO/api/auth/google/callback`) | **pendiente** |
| `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_RUT`, `NEXT_PUBLIC_LEGAL_ADDRESS` | Datos de la empresa en footer y documentos legales | opcional, recomendado |
| `POKEMONTCG_API_KEY` | Mejor límite de uso de la API de Pokémon | opcional |

El build ejecuta `prisma db push` solo con cambios **aditivos** (tablas y columnas nuevas y opcionales), así que el
deploy no toca datos existentes.

---

## 7. Decisiones que dejé escritas (confírmalas)

1. **Sin comisión por venta**: el sistema no cobra ninguna y la web lo promociona. Si algún día cobras, hay que cambiar los textos.
2. **Membresías**: no se reembolsan una vez activas, salvo falla nuestra o lo que exija la ley.
3. **Precios de los planes**: $4.990 y $7.990 de partida; se cambian desde el panel sin tocar código.
4. **Confirmar email**: solo se exige a cuentas nuevas y solo cuando el correo real está configurado.
5. **Marca en el código**: las cookies se llaman `dreamdeck_session` y `dreamdeck_cart_v1`. Es solo cosmético; **no conviene renombrarlas** porque cerraría la sesión de todos.
6. **Dominio propio para cada tienda**: descartado a propósito.

---

## 8. Inventario técnico

| | Cantidad |
|---|---|
| Páginas públicas | 25 |
| Páginas del panel | 16 |
| Rutas de API | 55 |
| Modelos de base de datos | 26 |
| Componentes de interfaz | 70 |
| Módulos de lógica (`src/lib`) | 53 |
| Comprobaciones e2e en `tests/` | 469 (8 baterías) |
| Crons | 2 (noticias cada 2 días; vencimiento de órdenes y fotos de precios a diario) |

**Integraciones:** Scryfall (Magic), pokemontcg.io y TCGdex (Pokémon), dotGG (One Piece), api.myl.cl (Mitos y Leyendas),
Banco Central vía mindicador.cl (dólar), Resend (correo), Google (login), Supabase (base de datos), Vercel (hosting).
**Retiradas:** Mercado Pago (se eliminó a propósito).

**Estados de una orden:** `PENDING` (esperando pago, con stock reservado) → `PAID` (el vendedor confirma) → `SHIPPED`
(el vendedor despacha, con courier y N° de seguimiento) → `DELIVERED` (el comprador confirma; habilita la reseña).
`CANCELLED` ocurre por el comprador o el vendedor mientras corresponda, o sola si vence el plazo de pago.
