# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Compradores, coleccionistas y vendedores de cartas TCG en Chile. La tarea confirmada es encontrar y comprar publicaciones reales, no explorar una enciclopedia sin stock.

## Product Purpose
TCG Cardeck conecta compradores y vendedores de singles, sellados, mazos y accesorios. Los mazos incluyen preconstruidos sin lista y mazos armados con lista opcional. El inicio orienta hacia el catálogo existente y un directorio geográfico de tiendas por región y comuna. Las tiendas mantienen /tienda/[slug], sin subdominios hasta disponer de dominio.

## Operating Context
Next.js, React, Tailwind, PostgreSQL y Prisma. Transferencia directa al vendedor, reserva de stock, cuenta de comprador, panel de vendedor y administrador. Precios CLP y contenido español de Chile.

## Capabilities and Constraints
Conservar rutas, compra, filtros, autenticación y consentimiento. No inventar atributos de cartas ausentes del modelo ni datos de ventas. Mantener SEO, accesibilidad y uso móvil. La base local no está configurada para operaciones e2e.

## Brand Commitments
Usar la marca TCG Cardeck y el logo del duende entregado por el usuario; retirar la marca anterior. Conservar los juegos actuales. El usuario pide alejarse del look SaaS genérico, usar tipografía sans contemporánea y familiar, rojo arcilla #b13a25, dorado y verde del nuevo logo sobre contenido blanco y gris claro; la corrección del 24-10-2026 pide navbar y footer azul oscuro #080b16 como el perfil, sin oscurecer el contenido. Contenedores centrados con ancho máximo de 1440 px y márgenes laterales en monitores grandes. El inicio usa una vitrina horizontal de productos reales, navegación manual y tipografía Roboto; se elimina la escena de cartas flotantes y la composición de texto junto a cartas. La corrección del usuario sustituye la dirección serif/editorial. Cartas, sellados y mazos son categorías separadas; las cartas agrupan vendedores y muestran el menor precio disponible y el historial real.

## Evidence on Hand
README.md, prisma/schema.prisma, src/app/(public), imágenes de catálogos externos y publicaciones de la base. No se proporcionaron nuevos testimonios ni métricas comerciales.

## Product Principles
- Publicaciones reales y compra comprensible.
- Contenido accesible sin depender de efectos.
- Vitrina manual sin autoplay; catálogo claro con bordes por producto y áreas de tiendas separadas.
- No confundir fallos de conexión con ausencia de publicaciones.
