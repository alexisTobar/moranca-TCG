# Win Condition TCG

Marketplace chileno de cartas coleccionables: **singles, sellados y mazos armados** de
Magic, Pokémon, One Piece y Mitos y Leyendas.

Las **imágenes de las cartas se buscan por nombre** en los catálogos oficiales de
cada juego; **los precios los pones tú**.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL
- **Despliegue:** listo para Vercel
- **Pagos:** transferencia bancaria directa al vendedor, con reserva de stock, código de referencia y comprobante

---

## 1. Base de datos (Supabase)

El proyecto usa **PostgreSQL** en Supabase (no SQLite, porque en Vercel el disco
es efímero y perderías las publicaciones en cada deploy).

1. Entra a <https://supabase.com> y crea un proyecto.
   **Guarda la contraseña de la base de datos**: se muestra una sola vez.
2. Dentro del proyecto, arriba: **Connect → ORMs → Prisma**.
3. Copia las dos cadenas a tu `.env`:

| Variable       | Cuál copiar            | Puerto | Para qué                |
| -------------- | ---------------------- | ------ | ----------------------- |
| `DATABASE_URL` | **Transaction pooler** | 6543   | Las consultas de la app |
| `DIRECT_URL`   | **Session pooler**     | 5432   | Migraciones de Prisma   |

```env
DATABASE_URL="postgresql://postgres.abcdefgh:TU_CLAVE@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10&pool_timeout=20"
DIRECT_URL="postgresql://postgres.abcdefgh:TU_CLAVE@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

> **Detalles importantes de Supabase:**
>
> - `DATABASE_URL` **debe** llevar `?pgbouncer=true&connection_limit=10&pool_timeout=20`.
>   Sin `pgbouncer=true` Prisma falla con *"prepared statement already exists"*;
>   con `connection_limit=1` (lo que sugiere la guía oficial) las páginas que
>   hacen varias consultas en paralelo agotan el pool y dan *timeout*.
> - Para `DIRECT_URL` usa el **Session pooler** (5432), no la conexión directa
>   `db.xxxx.supabase.co`: esa resuelve solo por IPv6 y falla en la mayoría de
>   las redes domésticas y en Vercel.
> - Si tu contraseña tiene caracteres especiales, codifícalos para URL
>   (`@` → `%40`, `#` → `%23`, `/` → `%2F`).
> - Las tablas se crean en el esquema `public` y las puedes ver en el
>   **Table Editor** de Supabase.

---

## 2. Puesta en marcha local

```bash
npm install
cp .env.example .env        # y completa DATABASE_URL / DIRECT_URL
npm run setup               # crea las tablas + carga admin y ejemplos
npm run dev
```

Abre <http://localhost:3000>.

### Acceso al panel

`/ingresar` con las credenciales definidas en `.env`:

| Variable         | Valor por defecto      |
| ---------------- | ---------------------- |
| `ADMIN_EMAIL`    | `admin@dreamdecktcg.cl`  |
| `ADMIN_PASSWORD` | `DreamDeckTCG2026!`      |

> **Cambia la contraseña antes de publicar el sitio.** Puedes editarla en `.env`
> y volver a correr `npm run db:seed`, o cambiarla desde *Panel → Perfiles → Clave*.

---

## 3. Despliegue en Vercel

1. Sube el proyecto a GitHub e impórtalo en Vercel.
2. En **Settings → Environment Variables** carga:
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `CRON_SECRET`.
3. Deploy. Luego, una sola vez, crea las tablas y el admin:

```bash
npx vercel env pull .env.production.local
npx dotenv -e .env.production.local -- npm run setup
```

`AUTH_SECRET` debe tener 32+ caracteres. Genéralo con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

---

## 4. Catálogos de cartas

| Juego            | Catálogo e imágenes    | Precio referencial     | ¿Clave? |
| ---------------- | ---------------------- | ---------------------- | ------- |
| Magic            | Scryfall               | TCGplayer (vía Scryfall) | No    |
| Pokémon          | pokemontcg.io / TCGdex | TCGplayer (vía pokemontcg.io) | No (opcional `POKEMONTCG_API_KEY`) |
| One Piece        | dotGG                  | TCGplayer (vía dotGG)  | No      |
| Mitos y Leyendas | api.myl.cl (74 ediciones) | Sin precio público | No |

Cada resultado muestra **nombre + código + edición + precio**. El precio llega en
USD y se convierte a pesos con el dólar observado del Banco Central
(`mindicador.cl`), y se ofrece como sugerencia al publicar: siempre lo puedes
cambiar.

### Sobre la API oficial de TCGplayer

TCGplayer **ya no entrega llaves nuevas**:

> *"We are no longer granting new API access at this time."*
> — <https://docs.tcgplayer.com/docs/getting-started>

Por eso los precios llegan a través de Scryfall, pokemontcg.io y dotGG, que
redistribuyen los mismos valores de TCGplayer con un día de rezago.

La integración oficial **ya está escrita** en `src/lib/providers/tcgplayer.ts` y
se activa sola si algún día consigues acceso: basta poner
`TCGPLAYER_PUBLIC_KEY` y `TCGPLAYER_PRIVATE_KEY` en el entorno. No busca por
nombre, usa el `productId` exacto que ya entregan Scryfall (`tcgplayer_id`,
presente en ~94% de las impresiones) y dotGG (`marketIds`, ~96% de las cartas),
así que no hay falsos positivos.

### Agregar juegos o ediciones

Cada juego vive en `src/lib/providers/`. Para agregar otro TCG basta crear un
archivo que exporte un `CardProvider` y registrarlo en `providers/index.ts`.

#### Mitos y Leyendas: cómo sumar ediciones

La API de MyL **no tiene índice de ediciones ni búsqueda global**, así que los
slugs se listan a mano en `MYL_EDITIONS` (`src/lib/providers/myl.ts`). El
índice oficial de ediciones por formato (con sus slugs reales) se puede
consultar en el filtro de `tor.myl.cl/cartas/{formato}` — es la fuente que se
usó para completar el listado de Imperio el 2026-09-06.

Hoy son **74 ediciones**, con dos formatos filtrables desde el buscador:

**Primer Bloque** — 4 ediciones base + sus 4 extensiones (según blog.myl.cl),
1.330 cartas:

| Edición base   | Su extensión  |
| -------------- | ------------- |
| Espada Sagrada | Cruzadas      |
| Helénica       | Imperio       |
| Dominios de Ra | Encrucijada   |
| Hijos de Daana | Tierras Altas |

**Imperio** — desde Bestiarium en adelante (`IMPERIO` en `myl.ts`), 15
ediciones vigentes a la fecha: Bestiarium, Secretos Arcanos, Lootbox Imperio
2024, Hielo Inmortal, Cenizas de Fuego, Onyria, Libertadores, Kaiju vs Mecha:
Titanes, Toolkit 2026 - Día de Muertos, Toolkit 2026 - Ritual Vudú, Chile
Oculto, AyD Vigilantes y los tres mazos preconstruidos de Imperio (Dragón,
Eterno, Guerrero). Cuando salga la próxima edición del formato, agrégala a
`IMPERIO` y a `MYL_EDITIONS`; las temporadas ya rotadas (Napoleón, Raciales
2024, Giger, Espíritu Samurái, Zodiaco, Amenaza Kaiju, Escuadrón Mecha, La
Venganza de Horus) quedan fuera del filtro aunque la API las marque con el
mismo prefijo `IMP -` — se verifica comparando `date_empire_valid` contra hoy,
o revisando el filtro vigente en `tor.myl.cl/cartas/imperio`.

Para agregar una edición nueva, prueba su slug en
`https://api.myl.cl/cards/edition/TU-SLUG`. Si responde `"status": "OK"`,
agrégalo al arreglo.

> **Ojo con los slugs:** la API mezcla separadores sin criterio —
> `espada-sagrada` con guion, pero `hijos_de_daana` con guion bajo. Si una
> forma falla, prueba la otra.
>
> **La API se cae de a ratos.** El primer sondeo sin reintentos encontró 33 de
> 57 ediciones reales; con 2-4 reintentos y espera creciente aparecen todas.
> `loadAll()` ya reintenta 2 veces por edición.
>
> **Calidad de los datos:** MyL guarda los nombres sin tildes y con la "ñ"
> borrada en vez de convertida ("bretaña" está guardado como "bretaa"). El
> buscador compensa esto probando ambas variantes, así que buscar "bretaña"
> igual encuentra la carta.

### Subir una imagen a mano

Cuando una carta o producto no aparece en ninguna API, el formulario de
publicar (bajo el buscador) trae una zona para **arrastrar o pegar una
imagen**, o pegar una URL externa. Los archivos se guardan en la propia base
de datos de Supabase (tabla `Upload`, hasta 4 MB, JPG/PNG/WEBP/GIF) y se sirven
desde `/api/uploads/{id}`. El servidor valida el contenido real del archivo
(no el nombre ni el mime que declara el navegador), así que un `.exe`
renombrado a `.png` se rechaza igual.

---

## 5. Pago: transferencia bancaria

No hay pasarela de por medio: el comprador transfiere directo a la cuenta del
vendedor. Cada vendedor configura su cuenta en **Panel → Mi perfil**.

**Flujo de una compra**

1. Al confirmar, las cartas quedan **reservadas** (se descuentan del stock de
   forma atómica, así dos compradores nunca se llevan la misma carta).
2. La orden recibe un **código de referencia** único (`DD-XXXXXXXX`) y un
   **plazo de pago** (48 h por defecto). El comprador ve la cuenta del vendedor
   con botón de copiar, el monto exacto y el código para poner en el comentario.
3. El comprador **sube su comprobante** (imagen o PDF). Solo lo ven el comprador,
   el vendedor de esa orden y el admin.
4. El vendedor revisa su cuenta bancaria y pulsa **Confirmar pago recibido**
   en **Panel → Órdenes**.
5. Si el plazo vence sin pago, la orden se **cancela sola** y el stock vuelve a
   la tienda (cron diario `/api/cron/expire-orders` más una revisión al comprar
   y al abrir *Mi cuenta*).

Cada cambio queda en el historial de la orden (`OrderEvent`): quién, qué y cuándo.

**Descuentos (los define el administrador)**

No hay ningún descuento fijo. En **Panel → Pagos y descuentos** (solo admin) se crean
descuentos por método de pago igual que los cupones (2%, 5%, 10%… hasta 30%), uno o
varios guardados, y se elige cuál queda **activo** (solo uno por método: transferencia o
efectivo). Sin ninguno activo el comprador paga el precio normal. También se define ahí el
plazo de pago. El cambio se refleja al instante en el checkout y en el aviso del encabezado.

Si un carrito trae cartas de más de un vendedor, el checkout lo separa
automáticamente en **una orden por vendedor**, cada una con su propia cuenta
y su propio chat.

> Las tablas nuevas se crean solas en cada deploy (`prisma db push` dentro de
> `npm run build`). Solo agrega columnas y tablas; si un cambio fuera destructivo,
> el deploy falla en vez de borrar datos.

---

## 5b. Página por carta, mercado y vendedores

Cada carta publicada con `externalId` (las que vienen del buscador de catálogo o de la carga
masiva) tiene su propia página en `/carta/[juego]/[id]`:

- **Todos los vendedores** que la tienen, con filtros de idioma, entrega (envío / retiro en
  persona) y **"cerca mío"** (el visitante elige su región y queda en una cookie).
- **Referencia de precio**: mínimo / mercado (mediana) / máximo por idioma, calculado con las
  ofertas activas, más el precio internacional (TCGplayer) cuando el juego lo entrega.
- **Historial de precio**: cada visita a la carta y el cron diario guardan una foto del precio
  (`PriceSnapshot`), así el gráfico se arma solo con el tiempo.
- **Últimas ventas** reales de esa carta.

Cada vendedor muestra su **calificación**, **+ventas** (órdenes con pago confirmado) y ubicación.
En **Panel → Mi perfil** el vendedor elige su región, comuna y si ofrece envío y/o retiro en
persona; el checkout respeta esas opciones.

**Carga masiva** (Panel → Publicar → Carga masiva): Magic (formato Moxfield), Pokémon (exportación
de Pokémon TCG Live, ej. `4 Pikachu ex SSP 57`) y One Piece (por código, ej. `4xOP01-024`).
Mitos y Leyendas no tiene carga masiva.

## 5c. Tiendas premium (membresía)

Un vendedor puede tener **su propia tienda** en `/tienda/[slug]`, con solo sus publicaciones:
banner, logo, color de marca, anuncio, redes (WhatsApp / Instagram / Facebook / sitio),
productos destacados, insignia "Tienda verificada" y estadísticas. Sigue siendo parte de Win
Condition (no hay dominio propio ni se quita la marca).

- **Todos los perfiles** se comparten con link corto `/v/[slug]` y QR (Panel → Mi perfil). Con
  tienda vigente el link es `/t/[slug]` y el QR lleva **el logo de la tienda al centro**
  (corrección de errores nivel H; se verificó que sigue leyéndose).
- **El administrador controla todo** en Panel → *Tiendas premium*: aprueba o rechaza pagos,
  regala o extiende planes, suspende, corta, destaca en el inicio ("Tiendas destacadas") y edita
  nombre, precio y beneficios de cada plan. Los planes por defecto (Tienda $4.990 y Pro $7.990
  al mes) se crean solos y se pueden cambiar.
- **Cada vendedor personaliza su tienda** en Panel → *Mi tienda*. Logo y banner solo se aceptan
  subidos a la plataforma.
- **Pago**: transferencia a la cuenta bancaria del usuario administrador (Panel → Mi perfil) con
  código `TI-XXXXXXXX` y comprobante privado; el administrador confirma y se activa el período.
  Sin pasarela de pago.
- Una tienda solo se muestra si está `ACTIVE` y con período vigente; si vence o se suspende,
  `/tienda/[slug]` redirige al perfil normal. Las visitas y escaneos de QR se cuentan por día
  (`StoreVisitDay`); el dueño y el administrador no cuentan.
- La base se actualiza sola en el deploy (`prisma db push`, solo tablas nuevas).
- **Menú propio de la tienda**: `/tienda/[slug]` mantiene arriba el logo y el menú de Win Condition
  (para quien quiera pasar al marketplace) y, debajo, un menú propio con el logo y buscador de la
  tienda y filtros solo de su catálogo (los tipos y juegos que ese vendedor tiene). La ficha de
  producto (`/tienda/[slug]/producto/[producto]`) también usa ese menú y no muestra a otros
  vendedores con la misma carta.

## 5d. Avisos del panel y soporte

- **Campana y contadores** (todos los paneles): se actualizan solos cada 30 s. El administrador ve
  pagos de membresía con comprobante por revisar, tickets con mensajes nuevos y solicitudes para
  ser vendedor; el vendedor ve respuestas de soporte sin leer y órdenes con comprobante por
  confirmar. El Resumen del panel muestra "Requiere tu atención".
- **Soporte** (Panel → Soporte): solo los vendedores con **tienda vigente** (Tienda o Pro) pueden
  abrir tickets al administrador; sin plan ven la opción bloqueada. Si el plan vence pueden leer su
  historial pero no escribir. Máximo 5 tickets abiertos por vendedor. El administrador ve la
  bandeja completa (Por responder / Respondidos / Cerrados) con el plan de cada vendedor.
- **Correo opcional**: con `RESEND_API_KEY` configurado, el administrador recibe un correo por cada
  ticket, mensaje o comprobante nuevo, y el vendedor cuando le responden. Sin la clave todo
  funciona igual dentro del panel.

## 5e. SEO y marketing

- **Página de venta `/tiendas`**: beneficios, planes con precio real (se leen de la base, así que
  cambian solos cuando el admin los edita), tabla comparativa, cómo funciona y preguntas
  frecuentes. El botón cambia según quién mira (visitante → crear cuenta, comprador → solicitar
  ser vendedor, vendedor → elegir plan). Se enlaza desde el menú, el footer, el hero y una
  sección de planes en el inicio.
- **Inicio**: H1 con la palabra clave ("Compra y vende cartas TCG en Chile"), título y
  descripción propios, preguntas frecuentes visibles y sección "Tu tienda propia" con los planes.
- **Técnico**: `robots.txt` (bloquea panel, cuenta, checkout y APIs), `sitemap.xml` (home,
  catálogo por juego y tipo, cartas, publicaciones activas, tiendas premium con plan vigente,
  vendedores y noticias; se regenera cada hora), favicon e imagen social (Open Graph 1200×630)
  generados, tarjeta grande en X/WhatsApp, `canonical` por página y datos estructurados
  (Organization, WebSite con buscador, FAQPage, BreadcrumbList y Product con precio en CLP).
- La ficha de producto dentro de una tienda apunta como canónica a la ficha general, para no
  duplicar contenido ante los buscadores.
- **Importante en Vercel**: define `NEXT_PUBLIC_SITE_URL` con el dominio real
  (`https://tu-dominio.cl`), porque de ahí salen el sitemap, los canonicals y las imágenes
  sociales. Después registra el sitio en Google Search Console y envía `/sitemap.xml`.

## 5g. Cuentas y seguridad

- **Correos de órdenes** (con `RESEND_API_KEY`): al vendedor cuando hay una compra nueva o suben un comprobante;
  al comprador cuando se confirma el pago, se envía el pedido (con courier y N° de seguimiento) o se cancela;
  a ambos si la orden vence. El vendedor ingresa el courier y el N° al marcar la orden como enviada.
- **Confirmar el email**: al registrarse llega un link (vale 24 h y es de un solo uso). Mientras no se confirme,
  la persona no puede comprar ni pedir ser vendedor. Solo se exige cuando el correo real está configurado y solo a
  cuentas creadas desde `VERIFICATION_START` (`src/lib/verification.ts`); las anteriores quedan exentas.
- **Login con Google**: se activa al definir `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`. Usa OAuth con PKCE y
  `state`. Si ya existe una cuenta con ese email, se vincula; si esa cuenta nunca confirmó su email, se le
  restablece la contraseña y se cierran sus sesiones (evita que quien la creó con un correo ajeno se quede con el acceso).
- **Verificación en dos pasos (TOTP)** opcional para todos, recomendada al admin (Panel → Mi perfil): app
  autenticadora + 8 códigos de respaldo de un solo uso. El secreto se guarda cifrado y un código no se puede reutilizar.
- **Contraseña y sesiones**: cambiar la contraseña desde la cuenta, "cerrar sesión en otros dispositivos" y recuperar
  la clave invalidan las demás sesiones (`User.tokenVersion`).
- **CSRF**: las peticiones que modifican datos vía `/api` deben venir del mismo origen (`src/middleware.ts`).
- **Auditoría** (Panel → Auditoría, solo admin): qué hizo el administrador y los cambios de seguridad de las cuentas.
- **Reportes**: cualquier persona con sesión puede reportar una publicación o un vendedor; el admin los resuelve
  (pudiendo pausar la publicación o suspender la cuenta) o los descarta (Panel → Reportes, con contador en la campana).
- **Tus datos**: en Mi cuenta se puede descargar una copia en JSON y eliminar la cuenta (se anonimizan los datos
  personales; se bloquea si hay órdenes en curso).
- **Salud y errores**: `GET /api/health` (para monitores de disponibilidad) y registro de errores del servidor en
  formato JSON (`src/instrumentation.ts`) visible en los logs de Vercel.
- **Pruebas y CI**: `tests/` (469 comprobaciones e2e, ver `tests/README.md`) y `.github/workflows/ci.yml`
  (tipos + build en cada cambio).

## 5f. Páginas legales

Enlazadas desde el footer (columna "Legal") y desde el registro y el checkout:
`/terminos-y-condiciones`, `/politica-de-privacidad`, `/devoluciones` y `/quienes-somos`.

- Están redactadas para cómo funciona la plataforma: somos un marketplace, el pago va directo al
  vendedor por transferencia y **Win Condition no maneja el dinero de las ventas, por eso no hace
  devoluciones ni reembolsos** (los resuelven comprador y vendedor; la plataforma orienta y actúa
  sobre las cuentas que incumplan). La única excepción explicada son las membresías de tienda.
- **Registro**: hay una casilla obligatoria para aceptar términos y privacidad. Se valida en el
  servidor y queda la constancia (`User.termsAcceptedAt` y `termsVersion`).
- El contenido vive en `src/app/(public)/<pagina>/page.tsx` y usa `LegalLayout` (índice lateral,
  secciones numeradas y bloque de contacto). Al cambiar un texto, actualiza `LEGAL_VERSION` y
  `LEGAL_UPDATED` en `src/lib/legal.ts`.
- **Datos de la empresa (opcionales)**: define en Vercel `NEXT_PUBLIC_CONTACT_EMAIL`,
  `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_LEGAL_RUT` y `NEXT_PUBLIC_LEGAL_ADDRESS` para que aparezcan
  en el footer y en los documentos. Si no están definidos, no se muestra nada inventado.
- **Revisión legal**: son textos de partida, hechos con el funcionamiento real del sitio. Conviene
  que un abogado los revise antes de publicarlos.

---

## 6. Cuentas y compradores registrados

Solo se puede comprar con sesión iniciada. Un comprador se autoregistra en
`/registro` (nombre, RUT con dígito verificador válido, teléfono, dirección,
contraseña) y queda con rol `BUYER`; `/checkout` y `/cuenta` exigen sesión
(el middleware redirige a `/ingresar?next=...`). Los vendedores y el admin se
siguen creando a mano desde **Panel → Vendedores**, como antes.

- **`/cuenta`**: cada usuario logueado edita sus datos, ve sus compras y —si
  es `BUYER`— puede mandar una solicitud para pasar a vendedor.
- **Panel → Vendedores**: el admin aprueba o rechaza esas solicitudes;
  aprobar sube el rol a `SELLER` al instante (sin esperar a que la persona
  vuelva a iniciar sesión — el chequeo de rol para entrar al panel se hace
  contra la base, no contra el rol guardado en la cookie de sesión).

### Login

`/ingresar` tiene **mostrar/ocultar contraseña**, **"Recordar sesión"** (30
días en vez de las 8 horas normales) y **recuperar contraseña**
(`/recuperar` → correo con link de un solo uso, vence en 1 hora, token
guardado con hash SHA-256). Sin `RESEND_API_KEY` configurado, el link de
recuperación no se manda por correo: queda en los logs del servidor para
poder probar el flujo igual (ver `.env.example`).

**Login con Google:** no está implementado todavía — necesita credenciales
OAuth propias (Client ID/Secret) desde Google Cloud Console, que solo se
pueden crear desde tu cuenta. Se agrega cuando las tengas.

---

## 7. Chat de la orden

Cada orden tiene su propio chat entre comprador y vendedor (`OrderMessage`),
visible en `/cuenta` para el comprador y en **Panel → Órdenes** para el
vendedor/admin. Sirve principalmente para mandar el comprobante de
transferencia (reusa el mismo endpoint de subida de imágenes que el
publicador de cartas). Los mensajes con groserías se **bloquean antes de
guardarse** (`src/lib/profanity.ts`) — quien escribe ve el error y puede
reformular, no hay censura silenciosa.

---

## 8. Seguridad implementada

- Contraseñas con **bcrypt** (12 rondas).
- Sesión en **JWT firmado (HS256)** dentro de una cookie `httpOnly`, `secure`,
  `sameSite=lax`, con expiración de 8 horas.
- Middleware que protege `/panel`, `/cuenta` y `/checkout`, y aplica **CSP,
  HSTS, X-Frame-Options, nosniff, Referrer-Policy y Permissions-Policy**.
- **Rate limiting** persistido en base de datos para login, registro y checkout
  (sobrevive entre instancias serverless); en memoria para el buscador de
  cartas y el chat de órdenes, que solo necesitan frenar abuso.
- Validación de toda entrada con **Zod**, incluido el dígito verificador del RUT.
- Los **precios y el stock siempre se leen de la base de datos**, nunca del
  cliente; la comuna se valida contra su región.
- Roles `ADMIN` / `SELLER` / `BUYER`: un vendedor solo edita sus publicaciones
  y solo ve las órdenes donde es el vendedor; un comprador solo ve sus
  propias órdenes. El chat de una orden solo lo puede leer su comprador, su
  vendedor o un admin.

---

## 9. Estructura

```
prisma/schema.prisma      Modelo de datos (User, Listing, Order, OrderMessage…)
prisma/seed.mjs           Admin inicial + publicaciones de ejemplo
src/app/(public)/         Tienda: home, catálogo, producto, carrito, checkout, cuenta
src/app/panel/            Panel privado: publicar, publicaciones, órdenes, perfil, vendedores
src/app/api/              Login, registro, cuenta, cartas, publicaciones, checkout, órdenes/chat
src/lib/providers/        Un archivo por catálogo de cartas
src/lib/regions.ts        16 regiones y 346 comunas de Chile (despacho es "por pagar")
src/lib/rut.ts            Validación y formato de RUT chileno
src/lib/profanity.ts      Filtro de groserías del chat de órdenes
src/components/cart/      Carrito (contexto, drawer, checkout, animación al agregar)
```

---

## 10. Comandos

| Comando           | Qué hace                                    |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo                      |
| `npm run build`   | Build de producción                         |
| `npm run setup`   | Crea tablas + carga admin y ejemplos        |
| `npm run db:seed` | Solo recarga el admin                       |
| `npm run db:studio` | Explorador visual de la base de datos     |
