import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";
import { B, Note, P, Table, UL } from "@/components/legal/blocks";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos personales recopila Win Condition TCG, para qué los usa, con quién los comparte, qué cookies usamos y cómo ejercer tus derechos.",
  alternates: { canonical: "/politica-de-privacidad" },
};

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Quién es responsable de tus datos",
    body: (
      <P>
        Win Condition TCG (“nosotros”) es el responsable del tratamiento de los datos personales que recopilamos en
        este sitio, conforme a la Ley N° 19.628 sobre protección de la vida privada y a la Ley N° 21.719 sobre protección
        y tratamiento de los datos personales, en los plazos en que esta última entre en vigencia. Los datos de contacto
        están al final de esta página.
      </P>
    ),
  },
  {
    id: "datos",
    title: "Qué datos recopilamos",
    body: (
      <>
        <Table
          head={["Categoría", "Qué datos", "Cuándo"]}
          rows={[
            ["Cuenta", "Nombre, email, RUT, teléfono, dirección y contraseña (guardada cifrada; nosotros no podemos verla).", "Al registrarte y al editar tu perfil."],
            ["Vendedores", "Cuenta bancaria (banco, tipo, número, titular y RUT), comuna y región, foto o logo y descripción.", "Cuando pides ser vendedor y completas tu perfil."],
            ["Compras y ventas", "Productos, montos, dirección y método de envío, notas de la orden, comprobantes de transferencia, mensajes del chat y reseñas.", "Cuando compras, vendes o conversas en una orden."],
            ["Tiendas y soporte", "Solicitudes de membresía y su comprobante, datos de personalización de la tienda y tickets de soporte.", "Cuando contratas un plan o nos escribes."],
            ["Técnicos", "Dirección IP (solo para límites anti-abuso), cookie de sesión y preferencias.", "Cada vez que usas el sitio."],
            ["Ingreso con Google", "Nombre, email verificado e identificador de tu cuenta de Google. Nunca recibimos tu contraseña de Google.", "Solo si eliges ingresar con Google."],
            ["Verificación en dos pasos", "Una clave secreta (guardada cifrada) y códigos de respaldo (guardados con hash).", "Solo si activas esta protección."],
            ["Estadísticas de tienda", "Conteo diario de visitas y escaneos de QR, sin identificar a las personas.", "Cuando alguien visita una tienda premium."],
          ]}
        />
        <P>No recopilamos datos de tarjetas: los pagos son transferencias directas entre las partes.</P>
      </>
    ),
  },
  {
    id: "usos",
    title: "Para qué usamos tus datos",
    body: (
      <>
        <UL
          items={[
            "Crear y administrar tu cuenta y verificar tu identidad.",
            "Gestionar tus compras y ventas: reservar stock, generar la orden, mostrar los datos necesarios a la otra parte y mantener el historial.",
            "Enviarte avisos del servicio, como la recuperación de contraseña o novedades de tu orden o de tus tickets.",
            "Darte soporte y resolver reclamos.",
            "Proteger la plataforma: prevenir fraudes, abusos e intentos de acceso indebido.",
            "Mejorar el sitio y cumplir obligaciones legales.",
          ]}
        />
        <P>
          Por ahora no enviamos publicidad. Si algún día lo hacemos, será solo con tu consentimiento y podrás retirarlo
          cuando quieras.
        </P>
      </>
    ),
  },
  {
    id: "compartimos",
    title: "Con quién compartimos tus datos",
    body: (
      <>
        <Note tone="warn" title="No vendemos tus datos">
          No vendemos ni arrendamos datos personales a terceros.
        </Note>
        <UL
          items={[
            <><B>Con la otra parte de la orden.</B> Si compras, el vendedor ve tu nombre, email, teléfono y dirección de envío para poder despachar. Si vendes, el comprador ve tu nombre, tus datos bancarios (para transferirte) y tu ubicación aproximada.</>,
            <><B>De forma pública.</B> El perfil de un vendedor (nombre, foto, descripción, comuna o región, calificaciones) es visible para cualquiera. Las reseñas muestran el nombre de quien las escribió.</>,
            <><B>Proveedores tecnológicos</B> que operan el servicio por encargo nuestro: alojamiento del sitio (Vercel), base de datos (Supabase) y envío de correos (Resend, cuando está configurado).</>,
            <><B>Google</B>, si eliges ingresar con tu cuenta de Google: le pedimos tu nombre y email verificado.</>,
            <><B>Catálogos de cartas</B> (Scryfall, Pokémon TCG y TCGdex, dotGG y api.myl.cl): al buscar cartas o ver imágenes, tu navegador se conecta a esos servidores y ellos pueden ver tu dirección IP.</>,
            <><B>Autoridades</B>, cuando la ley o una orden judicial lo exijan.</>,
          ]}
        />
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies y almacenamiento en tu navegador",
    body: (
      <>
        <Table
          head={["Nombre", "Para qué sirve", "Duración"]}
          rows={[
            ["dreamdeck_session", "Mantiene tu sesión iniciada. Es esencial: sin ella no puedes ingresar. No es accesible desde scripts (httpOnly).", "8 horas, o 30 días si eliges “Recordar sesión”."],
            ["wc_region", "Recuerda la región que elegiste para mostrarte vendedores cercanos.", "Hasta 1 año o hasta que la quites."],
            ["dreamdeck_cart_v1 (almacenamiento local)", "Guarda tu carrito en tu propio dispositivo. No se envía a nuestros servidores hasta que confirmas la compra.", "Hasta que lo vacíes o compres."],
            ["wc_2fa", "Recuerda por unos minutos que ya pusiste tu clave, mientras escribes el código de verificación en dos pasos. Solo existe si activaste esa protección.", "5 minutos."],
            ["wc_oauth", "Protege el ingreso con Google (evita que un tercero lo interfiera). Solo existe mientras ingresas con Google.", "10 minutos."],
          ]}
        />
        <P>
          <B>No usamos cookies de publicidad ni herramientas de analítica de terceros.</B> Puedes borrar o bloquear las
          cookies desde tu navegador; ten en cuenta que, si bloqueas la de sesión, no podrás iniciar sesión.
        </P>
      </>
    ),
  },
  {
    id: "seguridad",
    title: "Cómo protegemos tus datos",
    body: (
      <>
        <UL
          items={[
            "Las contraseñas se guardan cifradas con un algoritmo de hash (bcrypt).",
            "La comunicación viaja cifrada (HTTPS) y la sesión usa una cookie protegida.",
            "Los comprobantes de transferencia son privados: solo pueden verlos las partes de la orden y la administración.",
            "Aplicamos límites de intentos, validación de archivos y permisos por rol en cada acción.",
            "Puedes activar la verificación en dos pasos y cerrar tus sesiones en otros dispositivos desde tu cuenta.",
            "Dejamos un registro de las acciones sensibles del equipo administrador y de los cambios de seguridad de las cuentas.",
          ]}
        />
        <P>
          Ningún sistema es infalible. Si detectamos una vulneración que afecte tus datos, actuaremos y te informaremos
          según lo exige la ley.
        </P>
      </>
    ),
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo los conservamos",
    body: (
      <P>
        Mantenemos los datos de tu cuenta mientras esté activa. Las órdenes, comprobantes y mensajes se conservan por el
        tiempo necesario para atender reclamos y cumplir obligaciones legales, incluidas las contables y tributarias. Los
        registros técnicos de límites anti-abuso se eliminan automáticamente al cabo de pocas horas. Cuando ya no sean
        necesarios, los eliminamos o los anonimizamos.
      </P>
    ),
  },
  {
    id: "derechos",
    title: "Tus derechos",
    body: (
      <>
        <P>Puedes ejercer, en los términos de la ley, tus derechos de:</P>
        <UL
          items={[
            <><B>Acceso:</B> saber qué datos tuyos tratamos.</>,
            <><B>Rectificación:</B> corregir datos inexactos o incompletos. Muchos puedes editarlos tú mismo en “Mi cuenta” o “Mi perfil”, y puedes descargar una copia de tus datos desde ahí.</>,
            <><B>Supresión:</B> pedir que eliminemos tus datos cuando ya no sean necesarios o retires tu consentimiento. Puedes eliminar tu cuenta tú mismo desde “Mi cuenta” (sin órdenes en curso); se borran tus datos personales y se conservan, sin identificarte, las órdenes ya terminadas.</>,
            <><B>Oposición y bloqueo:</B> oponerte a ciertos tratamientos o pedir que se suspendan temporalmente.</>,
            <><B>Portabilidad:</B> recibir tus datos en un formato estructurado, cuando la ley lo reconozca.</>,
          ]}
        />
        <P>
          Para ejercerlos, escríbenos por los canales de contacto indicados abajo, desde el email de tu cuenta.
          Responderemos dentro de los plazos legales. Ten presente que algunos datos debemos conservarlos por obligación
          legal o para resolver reclamos en curso. Si crees que tus derechos no fueron respetados, puedes recurrir a la
          autoridad de protección de datos personales que corresponda.
        </P>
      </>
    ),
  },
  {
    id: "menores",
    title: "Menores de edad",
    body: (
      <P>
        La plataforma está dirigida a personas mayores de 18 años. Si nos enteramos de que una cuenta pertenece a un
        menor sin autorización de su representante legal, podremos suspenderla.
      </P>
    ),
  },
  {
    id: "transferencias",
    title: "Servidores fuera de Chile",
    body: (
      <P>
        Algunos de nuestros proveedores tecnológicos pueden almacenar o procesar datos en servidores ubicados fuera de
        Chile. Trabajamos con proveedores que aplican medidas de seguridad adecuadas para proteger tu información.
      </P>
    ),
  },
  {
    id: "cambios",
    title: "Cambios a esta política",
    body: (
      <P>
        Podemos actualizar esta política. Publicaremos la versión vigente con su fecha y, si el cambio es relevante, te
        avisaremos en la plataforma. Te recomendamos revisarla de vez en cuando. Complementa nuestros{" "}
        <Link href="/terminos-y-condiciones" className="font-semibold text-brand-600 hover:text-brand-700">
          Términos y condiciones
        </Link>
        .
      </P>
    ),
  },
  {
    id: "contacto",
    title: "Contacto",
    body: (
      <P>
        {CONTACT_EMAIL ? (
          <>
            Para consultas o para ejercer tus derechos escribe a{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-600 hover:text-brand-700">
              {CONTACT_EMAIL}
            </a>
            .
          </>
        ) : (
          <>
            Para consultas o para ejercer tus derechos, contáctanos desde el{" "}
            <Link href="/ayuda" className="font-semibold text-brand-600 hover:text-brand-700">
              centro de ayuda
            </Link>{" "}
            o, si tienes una tienda, abriendo un ticket de soporte desde tu panel.
          </>
        )}
      </P>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      current="/politica-de-privacidad"
      eyebrow="Documento legal"
      title="Política de privacidad"
      intro="Qué datos tuyos usamos, para qué, con quién los compartimos y cómo puedes controlarlos. Escrita para que se entienda."
      summary={
        <Note title="En resumen">
          <ul className="list-disc space-y-1 pl-5">
            <li>Usamos tus datos para que puedas comprar, vender y recibir soporte.</li>
            <li>El vendedor ve los datos que necesita para despachar tu pedido, y tú ves los de quien te vende.</li>
            <li>No vendemos tus datos y no usamos cookies de publicidad ni analítica de terceros.</li>
            <li>Puedes pedir acceso, corrección o eliminación de tus datos cuando quieras.</li>
          </ul>
        </Note>
      }
      sections={sections}
    />
  );
}
