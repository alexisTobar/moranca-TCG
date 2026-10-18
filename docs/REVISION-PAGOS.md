# Revisión del flujo de compra

El sitio utiliza transferencia bancaria directa al vendedor y efectivo al retirar. No existe una integración activa con Webpay, Mercado Pago ni otra pasarela de tarjetas. Los campos históricos preferenceId/paymentId no equivalen a una integración funcional.

## Correcciones implementadas

- Clave de idempotencia por compra, reclamada en la misma transacción que reserva stock. Reintentar una solicitud idéntica devuelve su respuesta original. Otro comprador o un contenido distinto no puede reutilizarla.
- El checkout exige aceptación explícita de términos y guarda la versión aceptada en la orden. Las políticas de pagos, privacidad y devoluciones están enlazadas antes de confirmar.
- Cotización válida antes de habilitar la compra; el servidor compara el total confirmado con el actual y revierte la operación si cambió.
- Validación de vendedor activo, rol autorizado, opciones de entrega y datos bancarios completos para transferencias. Rechazo de publicaciones duplicadas y control de precio/stock durante la reserva.
- Las órdenes pendientes con comprobante no se cancelan por vencimiento automático. El vendedor debe revisar el abono. La condición se comprueba otra vez al actualizar para resolver carreras con la subida del comprobante.
- La subida y sustitución del comprobante usa una actualización condicional; si cambió el estado de la orden, se revierte el archivo nuevo y se devuelve conflicto. Se elimina el archivo reemplazado dentro de la misma transacción.
- Cancelar una orden pagada exige registrar una referencia de devolución externa y la deja en la auditoría de la orden. Esto no prueba el abono bancario ni ejecuta un reembolso.
- El checkout comunica que se reserva, no que se cobra automáticamente. Explica pago, revisión y entrega. El retiro debe coordinarse con cada vendedor; se eliminó el punto fijo de Santiago que se aplicaba a todos.
- Las nuevas tablas de respuestas de compra y analítica quedan protegidas con RLS al ejecutar el build o `npm run db:push`.

## Verificación

- `npm run test:regression`: 13 casos con handlers reales y adaptadores controlados; sin tocar datos de producción.
- `npx tsc --noEmit`: validación de tipos.
- Revisión visual local de la portada con las cuatro imágenes originales; adaptación a móvil/escritorio y controles de animación.
- Los clientes e2e existentes ahora cotizan y envían los nuevos campos requeridos.

## Pendiente de validar en un entorno conectado

La conexión local mantiene valores de ejemplo en .env. No se ejecutaron migraciones, compras ni transferencias contra Supabase. Falta probar en PostgreSQL de pruebas: dos checkouts concurrentes con la misma clave, competencia por la última unidad, subida de comprobante frente a expiración y permisos reales RLS. Las pruebas con adaptadores no reemplazan esas comprobaciones.

Los cambios requieren desplegar juntos frontend, API y esquema. No hay conciliación bancaria automática, devolución automática ni cobro con tarjeta. Si se quiere incorporar una pasarela, se necesitan el proveedor elegido, la cuenta del comercio, sus credenciales y definir quién recibe los fondos en este marketplace.

Activación de respaldos, informes y datos legales: ver `RESPALDOS-Y-ANALITICA.md`.
