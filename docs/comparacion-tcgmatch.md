# Comparación de la portada de TCGmatch y TCG Cardeck

Fecha: 25 de octubre de 2026. Evidencia del competidor: HTML pegado por el usuario, no una prueba de sus sistemas de compra. Los enlaces y textos prueban lo que presentan, pero no permiten comprobar sus flujos privados ni las funciones que cargan después con JavaScript. TCG Cardeck se revisó en el código del proyecto; esto no certifica su despliegue ni una compra real.

| Elemento presentado en el HTML | Situación en TCG Cardeck | Diferencia concreta |
|---|---|---|
| Catálogo de cartas y últimos singles | Disponible | Tenemos agrupación por carta, mínimo disponible, vendedores y stock; catálogo paginado. |
| Comparación de vendedores | Disponible | Ficha de carta con ofertas por vendedor, estado, idioma y entrega. |
| Accesorios | Disponible | Categorías propias, sin juego ni idioma, fotos y descripción corta. |
| Sellados | Disponible | Categoría separada; conserva mazos de fábrica sin abrir. |
| Mazos construidos por vendedores | Disponible | Constructor con cartas/cantidades, lista obligatoria al publicar y venta del conjunto. El HTML recibido no permite asegurar un constructor equivalente en ellos. |
| Cartas gradeadas, PSA/BGS/CGC | Falta módulo propio | No hay empresa certificadora, nota, número de certificado ni búsqueda de slabs. Es diferente del estado NM/EX de una carta sin graduar. |
| Ofertas activas y página de descuentos | Parcial | Hay precio de oferta, descuentos y cupones; falta una página pública exclusiva que reúna solo ofertas vigentes. |
| Subastas y subastas activas | Falta módulo propio | No hay pujas, cierre con fecha, adjudicación, reglas de incremento ni gestión de pagos de ganadores. |
| Campañas por edición con comprar/publicar | Parcial | Hay noticias y búsqueda por nombre/set; faltan campañas administrables y páginas de colección por edición con ambas acciones. |
| Selector con diez TCG | Menor cobertura | Tenemos One Piece, Pokémon, Magic y Mitos y Leyendas. El selector de su HTML también presenta Riftbound, Gundam, Lorcana, Flesh and Blood, Digimon y Yu-Gi-Oh. Requiere proveedores, normalización, filtros y pruebas por juego. Dragon Ball aparece en el texto de un evento, lo que no prueba catálogo propio. |
| Evento propio TCG CON y cuenta regresiva | Parcial | Tenemos noticias y agenda con enlaces a organizadores; no una plataforma de eventos propios, inscripciones o entradas. |
| Blog | Cobertura diferente | Tenemos noticias, torneos y lanzamientos; falta una línea editorial de guías de juego/colección y autores si se desea ese alcance. |
| Actualización de precios | Disponible en fichas, presentación distinta | Hay referencias de mercado e historial de publicaciones locales. El encabezado aislado de su HTML no permite saber metodología ni frecuencia. |
| Directorio de vendedores | Disponible | Región/comuna, filtros, mapa y paginación. |
| Para tiendas y suscripción | Disponible | Planes, tienda con marca, catálogo, QR, administración y estadísticas. |
| Punto de venta | Falta módulo propio | Ellos lo anuncian; nuestro panel gestiona publicaciones/órdenes, pero no hay caja presencial, turnos ni conciliación de ventas en local. |
| Red de puntos de retiro | Parcial | Cada vendedor puede ofrecer retiro. No tenemos red central de locales asociados con disponibilidad y trazabilidad. |
| Enlaces a apps Android/iOS | Falta oferta propia | Nuestro sitio es responsive; el HTML enlaza tiendas de aplicaciones. No hay apps propias ni se comprobó el funcionamiento de las suyas. |
| Kit de marca público | Falta página de descarga | Tenemos el logo y documentación interna, pero no un kit público de formatos y usos. |
| Instagram/Facebook y contacto | Parcial/configurable | Tenemos correo de contacto por configuración y soporte. Faltan enlaces públicos a redes propias confirmadas; no deben sustituirse por redes del competidor. |
| SEO de portada | Disponible | Títulos, descripción, canonical, Open Graph, Twitter, JSON-LD, contenido español y sitemap. Su HTML añade datos legales/contacto/redes y SearchAction; nosotros solo debemos publicar datos propios verificados. |
| Analítica comercial | Cobertura diferente | Tienen etiquetas de GTM/GA/Clarity/Meta en el HTML. Tenemos estadísticas y consentimiento; esas etiquetas no son módulos de compra ni conviene copiar sus identificadores. |
| Ayuda y políticas | Disponible | Ayuda, términos, privacidad, cookies, envíos/pagos y devoluciones bajo TCG Cardeck. |

## Orden sugerido de implementación

1. **Ofertas y campañas por edición:** aprovechan precio de oferta, catálogo y noticias ya existentes; hacen más visible el stock y dan destinos claros a campañas.
2. **Cartas gradeadas:** definir certificadora, calificación, certificado, fotos y filtros antes de habilitar la categoría.
3. **Más juegos:** elegir cuáles tienen demanda y un catálogo/fuente mantenible; incorporarlos uno a uno.
4. **Subastas:** proyecto separado con reglas de pujas, cierre consistente, adjudicación y pagos; no se obtiene agregando un botón.
5. **Punto de venta, red de retiro y apps:** desarrollos posteriores según el modelo comercial y operación disponible.

## Cambios realizados en esta revisión

- Roboto aplicado explícitamente al body además de sus variables compartidas.
- Portada con recorrido de cámara visible, control de pausa/reanudación y pausa automática fuera de pantalla o con pestaña oculta.
- Cambio de categoría con transición breve, sin autoplay del catálogo; preferencia de movimiento reducido respetada.
- Cantidades de mazo con texto blanco sobre fondo oscuro, contador central visible y controles de 44 px; máximo de 99 copias igual que la validación de servidor.

La comparación identifica faltantes; no crea ni anuncia como disponibles los módulos pendientes.
