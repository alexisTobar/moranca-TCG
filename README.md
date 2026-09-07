# Dream Deck TCG

Tienda chilena de cartas coleccionables: **singles, sellados y mazos armados** de
Magic, Pokémon, One Piece y Mitos y Leyendas.

Las **imágenes de las cartas se buscan por nombre** en los catálogos oficiales de
cada juego; **los precios los pones tú**.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · PostgreSQL
- **Despliegue:** listo para Vercel
- **Pagos:** Mercado Pago (checkout + webhook firmado)

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
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` y (cuando actives pagos) `MP_ACCESS_TOKEN`
   y `MP_WEBHOOK_SECRET`.
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

## 5. Mercado Pago

Mientras `MP_ACCESS_TOKEN` esté vacío, el checkout **igual guarda la orden** y
avisa al comprador que lo contactarán. Al cargar el token, el botón redirige al
checkout real de Mercado Pago.

1. Crea la aplicación en <https://www.mercadopago.cl/developers/panel>.
2. Copia el *Access Token* de producción en `MP_ACCESS_TOKEN`.
3. En **Webhooks**, registra `https://TU-DOMINIO/api/mercadopago/webhook`
   y copia la *clave secreta* en `MP_WEBHOOK_SECRET`.

El webhook **verifica la firma HMAC** y consulta el pago en la API antes de
marcar la orden como pagada y descontar stock. Sin `MP_WEBHOOK_SECRET` las
notificaciones se rechazan (nunca se aceptan avisos sin verificar).

### Transferencia bancaria (opción por defecto)

El checkout ofrece **transferencia con 2% de descuento** como primera opción,
antes que Mercado Pago. No pasa por ninguna pasarela: se muestra la cuenta,
el comprador transfiere por su cuenta y manda el comprobante por email. La
orden queda `PENDING` hasta que la confirmes a mano en **Panel → Órdenes**.

**Completa tu cuenta real en `src/lib/bank.ts`** (banco, tipo de cuenta,
número, RUT, titular y el email donde te lleguen los comprobantes) — hoy
tiene placeholders `COMPLETAR: …` que se muestran tal cual en el checkout
mientras no los reemplaces.

---

## 6. Seguridad implementada

- Contraseñas con **bcrypt** (12 rondas).
- Sesión en **JWT firmado (HS256)** dentro de una cookie `httpOnly`, `secure`,
  `sameSite=lax`, con expiración de 8 horas.
- Middleware que protege `/panel` y aplica **CSP, HSTS, X-Frame-Options,
  nosniff, Referrer-Policy y Permissions-Policy**.
- **Rate limiting** persistido en base de datos para login y checkout (sobrevive
  entre instancias serverless); en memoria para el buscador de cartas, que solo
  necesita frenar abuso y no justifica una consulta a la base por cada tecla.
- Validación de toda entrada con **Zod**.
- Los **precios y el stock siempre se leen de la base de datos**, nunca del
  cliente; la comuna se valida contra su región.
- Roles `ADMIN` / `SELLER`: un vendedor solo puede editar sus publicaciones.

---

## 7. Estructura

```
prisma/schema.prisma      Modelo de datos (User, Listing, DeckCard, Order…)
prisma/seed.mjs           Admin inicial + publicaciones de ejemplo
src/app/(public)/         Tienda: home, catálogo, producto, carrito, checkout
src/app/panel/            Panel privado: publicar, publicaciones, órdenes, perfiles
src/app/api/              Login, búsqueda de cartas, publicaciones, checkout, webhook
src/lib/providers/        Un archivo por catálogo de cartas
src/lib/regions.ts        16 regiones y 346 comunas de Chile (despacho es "por pagar")
src/components/cart/      Carrito (contexto, drawer, checkout)
```

---

## 8. Comandos

| Comando           | Qué hace                                    |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo                      |
| `npm run build`   | Build de producción                         |
| `npm run setup`   | Crea tablas + carga admin y ejemplos        |
| `npm run db:seed` | Solo recarga el admin                       |
| `npm run db:studio` | Explorador visual de la base de datos     |
