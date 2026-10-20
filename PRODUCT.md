# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Compradores, coleccionistas y vendedores de cartas TCG en Chile. La tarea confirmada es encontrar y comprar publicaciones reales, no explorar una enciclopedia sin stock.

## Product Purpose
Win Condition TCG conecta compradores y vendedores de singles, sellados y mazos. El inicio orienta hacia el catálogo existente y un directorio geográfico de tiendas por región y comuna. Las tiendas mantienen /tienda/[slug], sin subdominios hasta disponer de dominio.

## Operating Context
Next.js, React, Tailwind, PostgreSQL y Prisma. Transferencia directa al vendedor, reserva de stock, cuenta de comprador, panel de vendedor y administrador. Precios CLP y contenido español de Chile.

## Capabilities and Constraints
Conservar rutas, compra, filtros, autenticación y consentimiento. No inventar atributos de cartas ausentes del modelo ni datos de ventas. Mantener SEO, accesibilidad y uso móvil. La base local no está configurada para operaciones e2e.

## Brand Commitments
Conservar Win Condition TCG, logo y juegos actuales. El usuario pide alejarse del look SaaS genérico, usar tipografía sans contemporánea y familiar, rojo/carmesí y dorado del logo sobre blanco y gris claro (el usuario rechaza explícitamente el fondo negro), ancho fluido y animaciones de cartas con Motion. La corrección del usuario sustituye la dirección serif/editorial. Cartas, sellados y mazos son categorías separadas; las cartas agrupan vendedores y muestran el menor precio disponible y el historial real.

## Evidence on Hand
README.md, prisma/schema.prisma, src/app/(public), imágenes de catálogos externos y publicaciones de la base. No se proporcionaron nuevos testimonios ni métricas comerciales.

## Product Principles
- Publicaciones reales y compra comprensible.
- Contenido accesible sin depender de efectos.
- Animación concentrada en el inicio; catálogo rápido de recorrer.
- No confundir fallos de conexión con ausencia de publicaciones.
