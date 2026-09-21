import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";
import { B, Note, P, Steps, Table, UL } from "@/components/legal/blocks";

export const metadata: Metadata = {
  title: "Devoluciones y reclamos",
  description:
    "Qué hacer si tu compra no llega bien: cómo se gestionan devoluciones, cambios y reembolsos entre comprador y vendedor, y qué puede hacer Win Condition TCG.",
  alternates: { canonical: "/devoluciones" },
};

const sections: LegalSection[] = [
  {
    id: "como-funciona",
    title: "Cómo funcionan las devoluciones aquí",
    body: (
      <>
        <P>
          En Win Condition TCG la venta es <B>entre el comprador y el vendedor</B>. El pago se transfiere directamente a
          la cuenta del vendedor, por lo que <B>nosotros no tenemos ese dinero</B> y, por eso, no podemos devolverlo ni
          ofrecer un reembolso propio. Tampoco recibimos ni reenviamos los productos.
        </P>
        <P>
          Lo que sí hacemos es dejar todo bien documentado (orden, código de referencia, comprobante y chat) para que
          puedan resolver cualquier problema con claridad, y actuar sobre las cuentas que no cumplan.
        </P>
      </>
    ),
  },
  {
    id: "quien-hace-que",
    title: "Quién hace qué",
    body: (
      <Table
        head={["Quién", "Qué le corresponde"]}
        rows={[
          ["Comprador", "Revisar el producto al recibirlo, reportar el problema al vendedor con pruebas y acordar la solución."],
          ["Vendedor", "Responder por lo que vendió, atender el reclamo, y devolver el dinero o reenviar cuando corresponda."],
          ["Win Condition TCG", "Proveer el chat y el historial de la orden, orientar a las partes y tomar medidas sobre cuentas que incumplan. No gestiona reembolsos."],
        ]}
      />
    ),
  },
  {
    id: "antes-de-comprar",
    title: "Cómo evitar problemas antes de comprar",
    body: (
      <UL
        items={[
          "Lee el estado, el idioma, la edición y si es foil. Cada dato importa en el precio de una carta.",
          "Mira las calificaciones, las reseñas y las ventas del vendedor.",
          "Pregunta por el chat de la orden lo que no esté claro, antes de pagar.",
          "Transfiere solo a la cuenta que aparece en tu orden y con tu código de referencia.",
          "Guarda tu comprobante y, al recibir, revisa el pedido de inmediato. Si puedes, grábalo al abrirlo.",
        ]}
      />
    ),
  },
  {
    id: "si-hay-un-problema",
    title: "Si hay un problema con tu pedido",
    body: (
      <>
        <P>Esto aplica si el producto llega dañado, distinto a lo publicado, incompleto o si no llega.</P>
        <Steps
          items={[
            { title: "Avisa lo antes posible", text: "Idealmente dentro de las primeras 72 horas desde que lo recibes. Usa el chat de la orden desde “Mi cuenta”." },
            { title: "Junta pruebas", text: "Fotos claras del producto y del embalaje, el número de seguimiento y, si tienes, el video de la apertura." },
            { title: "Acuerden la solución", text: "Reenvío, cambio, devolución con reembolso por transferencia o un descuento. Lo pactan entre ustedes y queda por escrito en el chat." },
            { title: "Si no responde o no cumple", text: "Escríbenos con el número de tu orden. Revisaremos el historial y podemos advertir, ocultar publicaciones o suspender al vendedor." },
          ]}
        />
        <Note tone="warn" title="Importante">
          Intervenir en un caso no significa garantizar un reembolso: no controlamos el dinero. Nuestro rol es orientar y
          actuar sobre la cuenta del vendedor si corresponde.
        </Note>
      </>
    ),
  },
  {
    id: "costos",
    title: "Costos de envío de una devolución",
    body: (
      <P>
        Lo acuerdan comprador y vendedor. Como criterio recomendado: si el error fue del vendedor (producto distinto,
        dañado por mal embalaje o incompleto), el vendedor cubre los envíos; si es por decisión del comprador, los cubre
        el comprador.
      </P>
    ),
  },
  {
    id: "arrepentimiento",
    title: "Cambio de opinión y derechos del consumidor",
    body: (
      <>
        <P>
          Al comprar a un particular no existe un derecho general a devolver solo por arrepentimiento, salvo que el
          vendedor lo ofrezca en su publicación. Sí puedes cancelar mientras la orden esté pendiente de pago, y en ese
          caso el stock se libera automáticamente.
        </P>
        <P>
          Si el vendedor actúa como <B>proveedor</B> en los términos de la Ley N° 19.496 sobre protección de los derechos
          de los consumidores (por ejemplo, una tienda), pueden corresponderte derechos como la garantía legal y el
          derecho de retracto, en las condiciones y con las excepciones que establece la ley. En ese caso, es el vendedor
          quien debe cumplirlos: exígeselos directamente. Puedes informarte o reclamar en el SERNAC.
        </P>
      </>
    ),
  },
  {
    id: "cancelaciones",
    title: "Cancelaciones y pagos ya hechos",
    body: (
      <UL
        items={[
          <><B>No has pagado:</B> puedes cancelar la orden desde tu cuenta. Si no pagas dentro del plazo, se cancela sola.</>,
          <><B>Ya transferiste y el vendedor no despacha:</B> reclámale por el chat. Si no responde, avísanos.</>,
          <><B>Transferiste a una cuenta equivocada:</B> contacta cuanto antes a tu banco. Nosotros no podemos revertir transferencias.</>,
        ]}
      />
    ),
  },
  {
    id: "membresias",
    title: "Membresías de tienda",
    body: (
      <P>
        Es el único caso en que el pago se hace a Win Condition TCG. Puedes cancelar una solicitud mientras esté pendiente
        de aprobación. Una vez activa, el período contratado no es reembolsable, salvo que la ley disponga otra cosa o que
        una falla nuestra te impida usar el servicio, caso en que extenderemos tu período. Más detalles en los{" "}
        <Link href="/terminos-y-condiciones#membresias" className="font-semibold text-brand-600 hover:text-brand-700">
          Términos y condiciones
        </Link>
        .
      </P>
    ),
  },
  {
    id: "seguridad",
    title: "Compra segura",
    body: (
      <UL
        items={[
          "Desconfía de quien te pida pagar fuera del proceso, a otra cuenta o sin el código de referencia.",
          "Ninguna persona de Win Condition TCG te pedirá tu contraseña.",
          "Si ves una publicación sospechosa o un vendedor que no cumple, repórtalo. Lo revisamos.",
        ]}
      />
    ),
  },
];

export default function ReturnsPage() {
  return (
    <LegalLayout
      current="/devoluciones"
      eyebrow="Ayuda y política"
      title="Devoluciones y reclamos"
      intro="Cómo se resuelven los problemas de una compra en Win Condition TCG, con las cosas claras sobre qué hace cada parte."
      summary={
        <Note tone="warn" title="Lo más importante">
          <p>
            Win Condition TCG <B>no realiza devoluciones ni reembolsos</B>: no vendemos los productos y no manejamos el
            dinero de las ventas. Compradores y vendedores lo resuelven entre ellos, con el chat y el historial de la orden
            como respaldo, y nosotros intervenimos sobre las cuentas que incumplan.
          </p>
        </Note>
      }
      sections={sections}
    />
  );
}
