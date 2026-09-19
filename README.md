# Dream Deck TCG

Tienda chilena de cartas coleccionables: **singles, sellados y mazos armados** de
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

En **Panel → Pagos y descuentos** (solo admin) se activa o desactiva el descuento
por transferencia y por efectivo, se elige el porcentaje (0 a 30) y el plazo de
pago. Aplica a toda la tienda y se refleja al instante en el checkout.

Si un carrito trae cartas de más de un vendedor, el checkout lo separa
automáticamente en **una orden por vendedor**, cada una con su propia cuenta
y su propio chat.

> Las tablas nuevas se crean solas en cada deploy (`prisma db push` dentro de
> `npm run build`). Solo agrega columnas y tablas; si un cambio fuera destructivo,
> el deploy falla en vez de borrar datos.

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
