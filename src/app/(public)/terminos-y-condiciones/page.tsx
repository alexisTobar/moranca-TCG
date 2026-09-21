import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";
import { B, Note, P, Steps, UL } from "@/components/legal/blocks";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Reglas de uso de Win Condition TCG: cómo funciona el marketplace, tus derechos y obligaciones como comprador o vendedor, pagos, envíos y tiendas premium.",
  alternates: { canonical: "/terminos-y-condiciones" },
};

const sections: LegalSection[] = [
  {
    id: "aceptacion",
    title: "Aceptación y definiciones",
    body: (
      <>
        <P>
          Estos términos regulan el uso del sitio y los servicios de Win Condition TCG. Al crear una cuenta, publicar
          productos, comprar o navegar por la plataforma, aceptas estos términos y nuestra{" "}
          <Link href="/politica-de-privacidad" className="font-semibold text-brand-600 hover:text-brand-700">
            Política de privacidad
          </Link>
          . Si no estás de acuerdo, no uses la plataforma.
        </P>
        <UL
          items={[
            <><B>Plataforma:</B> el sitio web Win Condition TCG y sus herramientas.</>,
            <><B>Usuario:</B> cualquier persona que usa la plataforma, con o sin cuenta.</>,
            <><B>Comprador:</B> usuario con cuenta que adquiere productos de un vendedor.</>,
            <><B>Vendedor:</B> usuario aprobado por nosotros para publicar y vender productos.</>,
            <><B>Tienda premium:</B> espacio propio y personalizable de un vendedor con membresía vigente.</>,
            <><B>Orden:</B> el registro de una compra entre un comprador y un vendedor, con su código de referencia.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "rol",
    title: "Qué es Win Condition TCG y cuál es nuestro rol",
    body: (
      <>
        <P>
          Win Condition TCG es un <B>marketplace</B>: un espacio donde compradores y vendedores de cartas
          coleccionables (Magic, Pokémon, One Piece y Mitos y Leyendas) se encuentran. Ponemos la tecnología:
          catálogo, carrito, reserva de stock, código de referencia, chat de la orden, reseñas y herramientas para
          vendedores.
        </P>
        <Note tone="warn" title="Lo que no somos">
          <p>
            No somos el vendedor de los productos ni parte del contrato de compraventa, que se celebra directamente
            entre comprador y vendedor. <B>No recibimos, retenemos ni administramos el dinero de las ventas</B>: el pago
            se transfiere directamente a la cuenta del vendedor. Tampoco almacenamos, despachamos ni certificamos la
            autenticidad de los productos.
          </p>
        </Note>
      </>
    ),
  },
  {
    id: "cuentas",
    title: "Cuentas y registro",
    body: (
      <>
        <UL
          items={[
            "Debes ser mayor de 18 años y capaz de contratar según la ley chilena.",
            "Debes entregar datos verdaderos y actualizados (nombre, RUT, teléfono y dirección) y mantenerlos al día.",
            "Eres responsable de tu contraseña y de todo lo que ocurra desde tu cuenta. Avísanos si sospechas un acceso no autorizado.",
            "Cada persona puede tener una sola cuenta. No puedes suplantar a otra persona ni a una tienda.",
            "Para vender debes solicitar ser vendedor desde tu cuenta. Podemos aprobar, rechazar o revisar cada solicitud.",
          ]}
        />
      </>
    ),
  },
  {
    id: "vendedores",
    title: "Reglas para vendedores",
    body: (
      <>
        <P>Si vendes en la plataforma, te comprometes a:</P>
        <UL
          items={[
            "Describir cada producto con exactitud: juego, edición, número, idioma, estado, si es foil y toda condición relevante.",
            "Usar fotos y textos propios o que tengas derecho a usar, y precios en pesos chilenos (CLP).",
            "Mantener el stock actualizado y cumplir las ventas confirmadas.",
            "Informar tus datos bancarios reales y a nombre de su titular; se muestran al comprador para que te transfiera.",
            "Despachar o coordinar el retiro dentro de los plazos que informes, y responder los mensajes de tus compradores.",
            "No vender réplicas, proxies, cartas falsificadas ni productos ilícitos presentados como originales o legítimos.",
            "Cumplir las normas que te apliquen, incluidas las tributarias y, si actúas como proveedor habitual, la Ley N° 19.496 sobre protección de los derechos de los consumidores.",
          ]}
        />
        <P>
          Eres el único responsable de tus publicaciones, de tus ventas, de emitir los documentos tributarios que
          correspondan y de atender los reclamos de tus compradores.
        </P>
      </>
    ),
  },
  {
    id: "compradores",
    title: "Reglas para compradores",
    body: (
      <UL
        items={[
          "Revisa con atención la foto, el estado, el idioma, el precio y las condiciones de envío antes de comprar.",
          "Compra de buena fe y paga dentro del plazo de la orden.",
          "Transfiere solo a la cuenta que aparece en tu orden y usa el código de referencia indicado.",
          "No subas comprobantes falsos ni alterados.",
          "Usa los datos del vendedor únicamente para gestionar tu compra.",
        ]}
      />
    ),
  },
  {
    id: "compra-y-pago",
    title: "Compra, pago y reserva de stock",
    body: (
      <>
        <Steps
          items={[
            { title: "Confirmas tu compra", text: "Se crea la orden y el stock queda reservado a tu nombre durante el plazo de pago, que se te informa al comprar." },
            { title: "Transfieres al vendedor", text: "Pagas por transferencia bancaria a la cuenta del vendedor, con el código de referencia de tu orden." },
            { title: "Subes el comprobante", text: "Solo pueden verlo tú, el vendedor y la administración de la plataforma." },
            { title: "El vendedor confirma y despacha", text: "Al verificar el pago en su cuenta, marca la orden como pagada y coordina el envío o el retiro." },
          ]}
        />
        <P>
          Si el pago no se confirma dentro del plazo, la orden se <B>cancela automáticamente</B> y el stock vuelve a
          quedar disponible. Los descuentos por método de pago los define la administración de la plataforma y los
          cupones los define cada vendedor; se aplican al confirmar la compra y quedan registrados en la orden.
        </P>
        <Note title="Ojo con las transferencias">
          Win Condition TCG no interviene en la transferencia y no puede revertirla. Antes de pagar, verifica que los
          datos coincidan con los de tu orden. Nunca pagues a una cuenta distinta ni por fuera del proceso.
        </Note>
      </>
    ),
  },
  {
    id: "envios",
    title: "Envíos y retiro",
    body: (
      <>
        <P>
          El vendedor define y ejecuta el despacho o el retiro en persona: courier, costo, plazos y seguimiento son de su
          responsabilidad y se informan al comprar. Win Condition TCG no despacha productos ni contrata couriers en nombre
          de los usuarios. En los retiros en persona, recomendamos elegir lugares públicos y concurridos.
        </P>
      </>
    ),
  },
  {
    id: "cancelaciones",
    title: "Cancelaciones, devoluciones y reclamos",
    body: (
      <>
        <P>
          Mientras la orden esté pendiente de pago puedes cancelarla desde tu cuenta. Una vez pagada, cualquier cambio,
          devolución o reembolso se acuerda entre comprador y vendedor, porque el dinero está en poder del vendedor.
        </P>
        <P>
          En la página de{" "}
          <Link href="/devoluciones" className="font-semibold text-brand-600 hover:text-brand-700">
            Devoluciones y reclamos
          </Link>{" "}
          explicamos paso a paso qué hacer si algo sale mal y qué puede (y qué no puede) hacer la plataforma.
        </P>
      </>
    ),
  },
  {
    id: "membresias",
    title: "Tiendas premium y membresías",
    body: (
      <>
        <P>
          Los vendedores pueden contratar un plan de tienda premium. Los planes, sus precios y sus beneficios se publican
          en la página{" "}
          <Link href="/tiendas" className="font-semibold text-brand-600 hover:text-brand-700">
            Abre tu tienda
          </Link>{" "}
          y pueden cambiar hacia adelante sin afectar los períodos ya pagados.
        </P>
        <UL
          items={[
            "El pago de la membresía es una transferencia a la cuenta de Win Condition TCG, con un código único, y se acredita con el comprobante.",
            "La tienda se activa cuando la administración aprueba el pago, por el período contratado.",
            "No hay renovación automática: al terminar el período, la tienda deja de mostrarse. Tu perfil de vendedor y tus datos se conservan, y al renovar todo vuelve a estar como lo dejaste.",
            "El período contratado no es reembolsable, salvo que la ley disponga otra cosa o que una falla imputable a la plataforma te impida usar el servicio, caso en que extenderemos el período afectado.",
            "Podemos suspender una tienda que incumpla estos términos. La membresía no garantiza un nivel de ventas.",
          ]}
        />
      </>
    ),
  },
  {
    id: "propiedad",
    title: "Contenido, propiedad intelectual y marcas",
    body: (
      <>
        <P>
          El diseño, el código y los textos de la plataforma pertenecen a Win Condition TCG. Al publicar fotos y
          descripciones nos otorgas una licencia gratuita y no exclusiva para mostrarlas en la plataforma y en su
          promoción, y declaras que tienes derecho a usarlas.
        </P>
        <P>
          Los nombres, imágenes y símbolos de los juegos son marcas y obras de sus respectivos titulares.
          Win Condition TCG no está afiliado ni respaldado por ellos. Las imágenes de catálogo provienen de servicios
          públicos de terceros. Si crees que algún contenido infringe tus derechos, avísanos y lo revisaremos.
        </P>
      </>
    ),
  },
  {
    id: "conducta",
    title: "Conducta prohibida",
    body: (
      <UL
        items={[
          "Fraude, suplantación de identidad o engaño a otros usuarios.",
          "Publicar productos falsificados, ilícitos o que infrinjan derechos de terceros.",
          "Manipular reseñas, calificaciones o el ranking de vendedores.",
          "Insultos, amenazas, discriminación o lenguaje ofensivo (el chat de las órdenes bloquea las groserías).",
          "Spam, publicidad no autorizada o contacto masivo.",
          "Extraer datos de forma automatizada o abusiva, o intentar vulnerar la seguridad del sitio.",
          "Usar los datos personales de otros usuarios para fines distintos de la gestión de una orden.",
        ]}
      />
    ),
  },
  {
    id: "suspension",
    title: "Suspensión y término",
    body: (
      <P>
        Podemos advertir, ocultar publicaciones, suspender o cerrar cuentas y tiendas cuando haya incumplimientos de estos
        términos, sospecha fundada de fraude o un requerimiento de la autoridad. Las órdenes en curso deberán cumplirse o
        resolverse entre las partes. Tú puedes pedir el cierre de tu cuenta en cualquier momento, sin perjuicio de las
        obligaciones pendientes.
      </P>
    ),
  },
  {
    id: "responsabilidad",
    title: "Limitación de responsabilidad",
    body: (
      <>
        <P>
          Como intermediarios, y en la medida que la ley lo permite, no respondemos por la calidad, autenticidad,
          estado, entrega o demora en la entrega de los productos, ni por los incumplimientos entre usuarios, ni por
          transferencias hechas a cuentas equivocadas. Tampoco por interrupciones del servicio, fallas de terceros
          (hosting, catálogos de cartas, bancos, couriers) o casos de fuerza mayor. La plataforma se entrega “tal como
          está”, sin garantías de disponibilidad continua.
        </P>
        <Note>
          Nada de lo anterior limita los derechos irrenunciables que la ley chilena te reconoce como consumidor.
        </Note>
      </>
    ),
  },
  {
    id: "privacidad",
    title: "Privacidad y cookies",
    body: (
      <P>
        El tratamiento de tus datos personales y el uso de cookies se explican en nuestra{" "}
        <Link href="/politica-de-privacidad" className="font-semibold text-brand-600 hover:text-brand-700">
          Política de privacidad
        </Link>
        , que forma parte de estos términos.
      </P>
    ),
  },
  {
    id: "cambios",
    title: "Cambios a estos términos",
    body: (
      <P>
        Podemos actualizar estos términos para reflejar cambios del servicio o de la ley. Publicaremos la nueva versión
        con su fecha de actualización y, si el cambio es importante, te avisaremos en la plataforma. Si sigues usando el
        sitio después de la actualización, entendemos que la aceptas.
      </P>
    ),
  },
  {
    id: "ley",
    title: "Ley aplicable y contacto",
    body: (
      <P>
        Estos términos se rigen por las leyes de la República de Chile. Para cualquier controversia, y sin perjuicio del
        derecho del consumidor de acudir al tribunal de su domicilio y a los canales del SERNAC, se someterán a los
        tribunales ordinarios de justicia de Chile. Para consultas, usa los datos de contacto al final de esta página.
      </P>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalLayout
      current="/terminos-y-condiciones"
      eyebrow="Documento legal"
      title="Términos y condiciones"
      intro="Las reglas del juego de Win Condition TCG, explicadas de forma clara: cómo funciona el marketplace y qué esperamos de compradores y vendedores."
      summary={
        <Note title="En resumen">
          <ul className="list-disc space-y-1 pl-5">
            <li>Somos un marketplace: conectamos compradores y vendedores de cartas TCG en Chile.</li>
            <li>La compra es entre tú y el vendedor, y el pago va directo a su cuenta por transferencia.</li>
            <li>Reservamos tu stock, generamos tu código de pago y guardamos tu comprobante.</li>
            <li>No manejamos el dinero de las ventas, por eso no realizamos devoluciones ni reembolsos.</li>
          </ul>
        </Note>
      }
      sections={sections}
    />
  );
}
