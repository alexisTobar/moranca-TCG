# Inicio TCG Cardeck
Modo: Persuade. Rediseño solicitado por el usuario el 25-10-2026 después de rechazar la vitrina aislada.

## Direction contract
THESIS: Una portada de marketplace completa: entrar al catálogo, entender las categorías y conocer la comunidad antes de comprar. Sin segundo buscador.
OWN-WORLD: Marco navy #080b16, mesa de juego azul #152a3b, blanco, dorado #e6b94a y rojo arcilla #b13a25. Logo del duende más visible. Roboto con jerarquía clara; producto y vendedor tienen regiones distintas.
STORY: Qué puedo comprar, qué juegos hay, qué acaba de publicarse, quién vende, cómo armo mi deck y cómo pago. Sellados conserva los preconstruidos; Mazos son decks construidos por el vendedor con lista.
FIRST VIEWPORT: Logo de 88px, campaña fotográfica horizontal de mesa de juego con título breve y dos acciones reales, seguida de cuatro entradas descriptivas a categorías. La vitrina y los juegos continúan la portada, no sustituyen toda la página.
FORM: Campaña de tienda, índice de categorías, catálogo real, noticias/agenda, comunidad, constructor de mazos y guía de compra. La fotografía ambienta; no representa stock. seed: none (unavailable).
SIGNATURE: Cámara lenta sobre la mesa durante 12 s, con pausa/reanudación, detención fuera de pantalla y pestaña oculta. Entrada de portada y cambio de categoría de 320 ms con clip-path. Rail manual con snap, flechas y teclado. Roboto explícito en el body; movimiento reducido sin desplazamientos ni bucles.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Extensión del 25-10-2026
El usuario pide movimiento perceptible y Roboto. Un único movimiento ambiental queda acotado a la fotografía; títulos y acciones permanecen fijos. Transiciones de categoría explican el cambio de inventario. La lista de mazo usa una etiqueta de cantidad de alto contraste y contador central con controles de 44 px. Comparación de funcionalidades del HTML de TCGmatch documentada en docs/comparacion-tcgmatch.md, sin prometer módulos pendientes.

## Corrección del 25-10-2026 (tarde)
El usuario pide un front moderno que no parezca generado y que luzca las cartas en venta. Se reemplaza la foto centrada por "la mesa": titular grande alineado a la izquierda y una mano de hasta 5 cartas reales con imagen, repartidas una sola vez al cargar (CSS, sin JS). Hover/foco levanta la carta y muestra el precio. Si hay menos de 3 cartas con imagen, vuelve la campaña fotográfica. Se retiran las entradas fade-up por sección.
