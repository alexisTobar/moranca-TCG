---
name: TCG Cardeck
description: Comercio TCG claro, cercano y centrado en publicaciones reales de Chile.
colors:
  primary: "#b13a25"
  primary-hover: "#8c2d20"
  carbon: "#080b16"
  paper: "#ffffff"
  content: "#f7f8fa"
  product-photo: "#f4f5f7"
  text: "#171c26"
  muted: "#586174"
  border: "#d8dee7"
  field-border: "#c9ced8"
  gold: "#e6b94a"
  gold-light: "#f1d27a"
  campaign: "#152a3b"
  community-surface: "#edf3ee"
  community-heading: "#1c392b"
  community-text: "#496251"
  community-link: "#26563c"
  store-surface: "#f0f4eb"
  store-border: "#d6dfca"
  store-heading: "#26361f"
  store-text: "#4d5a47"
  store-link: "#355622"
typography:
  display:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(38px, 4.5vw, 66px)"
    fontWeight: 750
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(36px, 4vw, 58px)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  price:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "21px"
    fontWeight: 700
rounded:
  field: "12px"
  product: "12px"
  image: "8px"
  action: "8px"
  search-action: "5px"
  filter: "6px"
  round: "50%"
spacing:
  compact: "8px"
  product: "12px"
  small: "16px"
  rail: "24px"
  store: "28px"
  section: "48px"
  home-section: "64px"
components:
  home-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.text}"
    rounded: "{rounded.action}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.action}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  search-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.search-action}"
    padding: "10px 25px"
  product:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.product}"
    padding: "12px"
  navigation:
    backgroundColor: "{colors.carbon}"
    textColor: "{colors.paper}"
  store-guide:
    backgroundColor: "{colors.store-surface}"
    textColor: "{colors.store-heading}"
    rounded: "{rounded.product}"
    padding: "28px"
---

# Design System: TCG Cardeck

## Overview

La marca TCG Cardeck usa el duende entregado por el usuario y una interfaz comercial moderna, familiar y comprensible. El contenido claro está enmarcado por navegación y footer azul oscuro. El inicio abre con una campaña fotográfica de mesa de juego, luego conecta categorías, juegos, productos, actualidad, comunidad y guías. Esta dirección sustituye la portada anterior centrada en una vitrina aislada.

La fotografía ambienta el juego compartido; no representa productos disponibles. Las publicaciones, precios y vendedores proceden del marketplace. El verde distingue la comunidad; el dorado guía las acciones principales de la campaña y del constructor de mazos.

**Key Characteristics:**
- Roboto y títulos en caja normal.
- Dorado para acciones principales del inicio, enlaces arcilla y verde para comunidad y tiendas.
- Contenedores centrados, productos delimitados y superficies mayormente planas.
- Contenido y precios reales, con estados de error explícitos.

## Colors

### Primary

El rojo arcilla `primary` identifica acciones del catálogo, selección, foco y enlaces; `primary-hover` refuerza enlaces del inicio. El inicio usa dorado en sus acciones principales de campaña y constructor. Los tokens globales históricos `brand-*` y las asignaciones de otras rutas siguen presentes; no deben sustituirse globalmente por esta decisión de portada.

### Secondary

El dorado `gold` y su variante clara `gold-light` acompañan la marca y destacan acciones o enlaces sobre el marco oscuro. `campaign` sostiene el constructor de mazos y el ambiente azul de la fotografía. Los verdes `community-*` distinguen la comunidad del inicio; `store-*` conserva la guía de tiendas compartida.

### Neutral

`carbon` enmarca navegación y footer. `paper` sostiene el contenido y los productos; `content` separa áreas de página y `product-photo` contiene imágenes. `text` y `muted` establecen la jerarquía; `border` y `field-border` delimitan productos y campos.

## Typography

Roboto se carga mediante `next/font/google` y `--font-body`; el alias histórico `--font-editorial` resuelve a la misma familia. No implica una tipografía serif.

El display corresponde al único h1 del inicio; en móvil usa 40 px. Headline corresponde al directorio. Los h2 del inicio usan `clamp(25px,2.2vw,34px)`, peso 700 y altura 1.2. Los títulos de la vitrina usan 14 px, peso 600, altura 1.5 y dos líneas; el catálogo conserva title. Los precios de la vitrina usan 20 px y cifras tabulares en CLP. Las etiquetas de vendedor y juego son secundarias (12 px).

## Layout

El contenedor compartido tiene ancho máximo de 1440 px, centrado y padding horizontal `clamp(16px, 3vw, 48px)`. Conserva márgenes visibles en monitores grandes. Los grids usan columnas con mínimo cero para permitir reducción sin desbordamiento.

La vitrina del inicio muestra cinco productos desde 1280 px, cuatro hasta 1279 px, tres hasta 900 px y un producto con avance del siguiente hasta 639 px (ancho de elemento 72%, separación 14 px). Escritorio usa separación de 24 px. Estas reglas están acotadas a `.cardeck-home`; el catálogo conserva dos columnas, tres desde 640 px y cuatro desde 1280 px.

La campaña mide al menos 400 px (440 px desde 1800 px y 390 px en móvil). Su índice de cuatro categorías pasa a dos columnas hasta 900 px. Las noticias pasan de tres columnas a una en móvil; la agenda oficial pasa de cuatro a dos hasta 900 px y una hasta 639 px. La comunidad pasa de dos columnas a una y el constructor de dos a una en móvil. El ritmo principal es de 64 px entre secciones y 42 px en móvil. El bloque de tiendas compartido conserva su adaptación a columna y padding de 22 px.

## Elevation & Depth

El inicio y catálogo separan contenido mediante bordes y fondos, sin sombras de tarjeta. La imagen está contenida en su propio fondo claro. Otras rutas conservan utilidades compartidas de sombra y botones con degradado; no son la referencia para ampliar la vitrina. El foco visible y los cambios de color aportan respuesta sin convertir productos en objetos flotantes.

## Shapes

Los productos tienen borde continuo de 1 px y esquinas de 12 px; la vitrina del inicio usa padding de 10 px y el catálogo conserva el suyo. La imagen de la vitrina tiene esquinas de 8 px y proporción 1/1.15, con arte contenido. La campaña y los bloques de colección y constructor usan 16 px; las noticias usan 12 px. Los campos compartidos tienen 12 px; los botones del inicio y catálogo, 8 px. Las flechas de la vitrina son círculos de 40 px. Los filtros del catálogo tienen 6 px y un alto mínimo de 36 px.

## Components

Las acciones principales de campaña y constructor usan dorado; el catálogo conserva rojo arcilla con texto blanco. Hay un único buscador visible, en la cabecera: ocupa la barra principal desde lg y su fila móvil por debajo. La portada no agrega otro buscador ni cambia su alcance al filtrar la vitrina. El foco de los enlaces y controles del inicio usa contorno arcilla de 3 px separado 4 px. Los campos generales conservan borde y anillo de foco de marca.

Las categorías de la vitrina usan botones con `aria-pressed`, texto y subrayado de 3 px para la selección. La navegación manual combina flechas con nombres accesibles, scroll snap, teclado y gesto táctil. Las flechas se deshabilitan en los extremos; no hay autoplay. El desplazamiento respeta movimiento reducido.

Cada producto reúne foto sin recortar el contenido, juego, título y precio. Las cartas individuales se agrupan por identidad canónica: muestran «Desde», el menor precio efectivo entre ofertas con stock, stock agregado y cantidad de vendedores. `homeCardMarket` resuelve la agregación SQL y una consulta por lote para cargar los registros (dos consultas). Sellados, mazos y accesorios mantienen sus publicaciones propias. Sellados incluye preconstruidos de fábrica sin abrir; Mazos exige una lista de cartas y cantidades. No se reclasifica por palabras del nombre. El catálogo agrega detalles y una separación visible para el vendedor. No se presentan publicaciones ficticias si falla la carga: fallo y selección vacía tienen mensajes distintos.

La navegación y el footer usan el marco oscuro; el menú móvil conserva fondo blanco y texto oscuro. El duende conserva sus píxeles y proporciones, con altura de 88 px en cabecera y 116 px en footer. Los logos remotos de juegos tienen un fallback textual incluso si fallan antes de la hidratación.

Actualidad y agenda permanecen visibles aunque no haya noticias. El fallback en español se actualiza cada tres días; las noticias de más de 90 días se excluyen. El feed oficial de One Piece consultado contiene fechas de marzo de 2026, por lo que esas entradas no aparecen como actualidad; su enlace oficial sigue accesible. Fechas, fuentes y disponibilidad se explicitan sin inventar eventos.

La apertura de campaña usa clip-path y traslación de 10 px durante .8 s con `cubic-bezier(.16,1,.3,1)`. Con movimiento reducido se eliminan animación y transiciones y el scroll solicitado es instantáneo. El contenido permanece visible sin JavaScript. La fotografía `public/cardeck-tabletop.png` fue generada mediante imagegen; conserva sidecar de prompt y procedencia embebida. El logo original conserva también metadatos de procedencia.

## Do's and Don'ts

- **Do** conservar el logo del duende TCG Cardeck y sus proporciones.
- **Do** mantener bordes visibles por producto y una zona de tiendas diferenciada.
- **Do** conservar márgenes en pantallas grandes, foco visible y navegación manual accesible.
- **Do** mantener un único buscador visible en cabecera, categorías claras, precios mínimos reales y vendedores agregados por carta.
- **Don't** reintroducir la escena de cartas flotantes o la composición de texto junto a cartas en el inicio.
- **Don't** sustituir Roboto por la dirección serif anterior ni convertir el comercio en mosaicos genéricos de iconos.
- **Don't** confundir un fallo de conexión con ausencia de publicaciones.

Verificación de esta revisión: capturas completas del inicio en escritorio, móvil y 2560 px, más recortes de apertura, productos, noticias y vendedores en `.impeccable/review`. Las capturas usan una instantánea de ofertas públicas con resúmenes de mercado y dos perfiles sintéticos identificados para probar la composición; no prueban operaciones de una base de datos viva ni concurrencia. La ruta real se comprobó por separado con noticias en español, un h1, canonical y datos Organization/WebSite/CollectionPage/FAQPage. Pasaron 42 pruebas, incluidas ofertas competidoras agrupadas al menor precio y conservación de SEALED. Typecheck y build final de producción pasaron (exit 0), con la ruta QA original restaurada y sin fixture temporal en la entrega. La revisión de esta portada resolvió los tres hallazgos de código/capturas y concluyó «Ship once documentation and build are complete»; ambas condiciones se completaron. Este alcance no certifica todas las rutas del sitio. La aprobación de la portada anterior no se aplica a este rediseño.
