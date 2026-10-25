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
  store-surface: "#f0f4eb"
  store-border: "#d6dfca"
  store-heading: "#26361f"
  store-text: "#4d5a47"
  store-link: "#355622"
typography:
  display:
    fontFamily: "Roboto, Arial, sans-serif"
    fontSize: "clamp(28px, 3vw, 44px)"
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: "-0.025em"
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
components:
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

La marca TCG Cardeck usa el duende entregado por el usuario y una interfaz comercial moderna, familiar y comprensible. El contenido claro está enmarcado por navegación y footer azul oscuro. Las fotos, los precios y los vendedores llevan la atención; los bordes separan productos y las áreas verdes identifican tiendas.

**Key Characteristics:**
- Roboto y títulos en caja normal.
- Rojo arcilla para acciones, dorado sobre el marco oscuro y verde para tiendas.
- Contenedores centrados, productos delimitados y superficies mayormente planas.
- Contenido y precios reales, con estados de error explícitos.

## Colors

### Primary

El rojo arcilla `primary` identifica acciones de compra, búsqueda, selección y enlaces; `primary-hover` refuerza la respuesta al pasar el puntero. Los tokens globales históricos `brand-*` siguen presentes para otras rutas; el inicio y catálogo usan las asignaciones de esta documentación.

### Secondary

El dorado `gold` y su variante clara `gold-light` acompañan la marca y destacan acciones o enlaces sobre el marco oscuro. Los verdes `store-*` distinguen superficies, texto, bordes y enlaces de tiendas.

### Neutral

`carbon` enmarca navegación y footer. `paper` sostiene el contenido y los productos; `content` separa áreas de página y `product-photo` contiene imágenes. `text` y `muted` establecen la jerarquía; `border` y `field-border` delimitan productos y campos.

## Typography

Roboto se carga mediante `next/font/google` y `--font-body`; el alias histórico `--font-editorial` resuelve a la misma familia. No implica una tipografía serif.

El display corresponde al título del inicio; headline corresponde al directorio. Los títulos de productos usan title y se limitan a dos líneas; en móvil bajan a 14 px. El texto introductorio pasa de 16 a 14 px en móvil. Los precios usan cifras tabulares, peso fuerte y CLP. Las etiquetas de vendedor y juego son secundarias (12 px).

## Layout

El contenedor compartido tiene ancho máximo de 1440 px, centrado y padding horizontal `clamp(16px, 3vw, 48px)`. Conserva márgenes visibles en monitores grandes. Los grids usan columnas con mínimo cero para permitir reducción sin desbordamiento.

La vitrina manual muestra cuatro productos en escritorio, tres hasta 1023 px y un producto con avance del siguiente hasta 639 px (ancho de elemento 76%, separación 14 px). Escritorio usa separación de 24 px. El catálogo usa dos columnas, tres desde 640 px y cuatro desde 1280 px. El bloque de tiendas pasa a columna en móvil, con padding de 22 px. Las categorías pueden desplazarse horizontalmente sin ensanchar la página.

## Elevation & Depth

El inicio y catálogo separan contenido mediante bordes y fondos, sin sombras de tarjeta. La imagen está contenida en su propio fondo claro. Otras rutas conservan utilidades compartidas de sombra y botones con degradado; no son la referencia para ampliar la vitrina. El foco visible y los cambios de color aportan respuesta sin convertir productos en objetos flotantes.

## Shapes

Los productos tienen borde continuo de 1 px, esquinas de 12 px y padding de 12 px. La fotografía de la vitrina tiene esquinas de 8 px; la del catálogo, 10 px. Los campos compartidos tienen 12 px; los botones del inicio y catálogo, 8 px. Las flechas de la vitrina son círculos de 40 px. Los filtros del catálogo tienen 6 px y un alto mínimo de 36 px.

## Components

Los botones principales del inicio y catálogo usan rojo arcilla con texto blanco. La búsqueda del inicio tiene contenedor blanco, borde visible, ancho máximo de 600 px y botón con alto mínimo de 44 px. El foco de la búsqueda y de los controles de la vitrina usa contorno rojo de 2 px, separado del elemento. Los campos generales usan borde y anillo de foco de marca.

Las categorías de la vitrina usan botones con `aria-pressed`, texto y subrayado de 3 px para la selección. La navegación manual combina flechas con nombres accesibles, scroll snap, teclado y gesto táctil. Las flechas se deshabilitan en los extremos; no hay autoplay. El desplazamiento respeta movimiento reducido.

Cada producto reúne foto sin recortar el contenido, juego, título, precio y vendedor. El catálogo agrega detalles y una separación visible para el vendedor. El bloque verde de tiendas tiene título, explicación y enlace reconocible. No se presentan publicaciones ficticias si falla la carga: los estados de fallo y de selección vacía tienen mensajes distintos.

La búsqueda pública indica su alcance según la categoría seleccionada. La selección inicial «Para descubrir» busca explícitamente «cartas»; Mazos, Sellados y Accesorios cambian tanto la etiqueta como el parámetro de búsqueda. La navegación y el footer usan el marco oscuro; el menú móvil conserva fondo blanco y texto oscuro.

## Do's and Don'ts

- **Do** conservar el logo del duende TCG Cardeck y sus proporciones.
- **Do** mantener bordes visibles por producto y una zona de tiendas diferenciada.
- **Do** conservar márgenes en pantallas grandes, foco visible y navegación manual accesible.
- **Do** mantener categorías y alcance de búsqueda comprensibles, con publicaciones y precios reales.
- **Don't** reintroducir la escena de cartas flotantes o la composición de texto junto a cartas en el inicio.
- **Don't** sustituir Roboto por la dirección serif anterior ni convertir el comercio en mosaicos genéricos de iconos.
- **Don't** confundir un fallo de conexión con ausencia de publicaciones.

Verificación de esta entrega: revisión visual aprobada del inicio a 390, 1440 y 2560 px y del directorio a 390 y 1440 px; sin desbordamiento horizontal en comprobaciones a 390, 768, 1290, 1440, 1920 y 2560 px. Se comprobaron paginación de 18 resultados, avance y búsqueda con 120 perfiles sintéticos, 40 pruebas de regresión y build de producción. El fixture no demuestra capacidad de usuarios concurrentes. La configuración local de base de datos contiene un valor de ejemplo: la aplicación real del esquema y las operaciones con base de datos viva quedan sin validar.
