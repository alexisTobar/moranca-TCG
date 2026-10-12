import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { P, UL, Note } from "@/components/legal/blocks";

export const metadata: Metadata = { title: "Envíos y pagos", alternates: { canonical: "/envios-y-pagos" } };
export default function ShippingPaymentsPage() {
  return <LegalLayout current="/envios-y-pagos" eyebrow="Antes de comprar" title="Envíos y pagos" intro="Cómo se reserva tu compra, a quién pagas y cómo coordinas la entrega." sections={[
    { id: "medios", title: "Medios de pago y destinatario", body: <><P>Actualmente admitimos transferencia bancaria directa al vendedor y efectivo para retiro en persona. No cobramos tarjetas ni ofrecemos custodia de fondos. Los precios son en pesos chilenos (CLP). Si compras a varios vendedores, se crea una orden y un pago separado por cada uno.</P><P>Antes de confirmar revisa productos, cantidades, descuentos y total. Para transferencias, el vendedor debe tener completos sus datos bancarios. Usa los datos de tu orden y su referencia; no pagues a cuentas recibidas por mensajes externos sin verificarlas con el vendedor.</P></> },
    { id: "comprobantes", title: "Reserva y confirmación del pago", body: <><UL items={[
      "Al crear la orden se reserva el stock y se informa el vencimiento de pago.",
      "Subir un comprobante no confirma el pago: el vendedor debe verificar el abono real en su cuenta.",
      "Una orden pendiente vencida sin comprobante se cancela automáticamente y libera el stock. Si hay un comprobante, queda pendiente de revisión del vendedor y no se cancela por el proceso automático.",
      "Si transferiste y no pudiste subir el comprobante, contacta al vendedor desde la orden antes del vencimiento. No vuelvas a transferir sin aclarar el estado del primer pago.",
      "En efectivo, el pago se verifica al realizar el retiro acordado.",
    ]} /><Note>La reserva no es un cobro. Un comprobante no es una garantía de recepción de dinero.</Note></> },
    { id: "envios", title: "Despacho y retiro", body: <><P>Cada vendedor indica si ofrece envío, retiro o ambos. Los envíos son por pagar: el transportista cobra el flete al destinatario y ese importe no está incluido en el total pagado al vendedor. No significa envío gratis. Coordina con el vendedor el transportista, costo estimado y plazo antes de pagar; no hay una tarifa o plazo universal de la plataforma.</P><P>El retiro se coordina con cada vendedor. Confirma ubicación, fecha y horario en el chat de la orden; no asumas que todos los vendedores tienen el mismo punto de entrega. Para despacho, revisa la dirección, región y comuna. Solicita el seguimiento al vendedor y confirma recepción cuando efectivamente recibas el pedido.</P></> },
    { id: "incidencias", title: "Cancelaciones, devoluciones y problemas", body: <><P>Si ya pagaste, cancelar la orden en la plataforma no devuelve automáticamente el dinero: el vendedor debe gestionar y acreditar el reembolso que corresponda. Para cancelar una orden marcada como pagada se exige registrar una referencia de devolución; este registro es una declaración del vendedor o administrador, no una validación bancaria automática. Conserva comprobantes y conversaciones. Puedes reportar un problema desde tu cuenta y consultar la <Link href="/devoluciones" className="underline">política de devoluciones y reclamos</Link>.</P><P>Estas condiciones no limitan los derechos irrenunciables que correspondan según la legislación chilena ni excluyen las responsabilidades legales de la plataforma.</P></> },
  ]} />;
}
