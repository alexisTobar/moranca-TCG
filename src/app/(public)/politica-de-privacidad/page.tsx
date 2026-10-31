export const dynamic = "force-static";
export const revalidate = 3600;
import Link from "next/link";
import type { Metadata } from "next";
import { LegalLayout, type LegalSection } from "@/components/legal/LegalLayout";
import { B, Note, P, Table, UL } from "@/components/legal/blocks";
import { CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_UPDATED, LEGAL_VERSION } from "@/lib/legal";

const entity = [LEGAL_ENTITY.name, LEGAL_ENTITY.rut && `RUT ${LEGAL_ENTITY.rut}`, LEGAL_ENTITY.address && `domicilio en ${LEGAL_ENTITY.address}`].filter(Boolean).join(", ");
const RIGHTS_FORM = "/ayuda?tema=DATOS#contacto";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Qué datos personales recopila TCG Cardeck, para qué los usa, con quién los comparte, qué cookies usamos y cómo ejercer tus derechos.",
  alternates: { canonical: "/politica-de-privacidad" },
};

const sections: LegalSection[] = [
  {
    id: "responsable",
    title: "Quién es responsable de tus datos",
    body: (
      <>
        <P>
          TCG Cardeck (“nosotros”){entity ? <> ({entity})</> : null} es el responsable del tratamiento de los datos
          personales que recopilamos en este sitio, conforme a la Ley N° 19.628 sobre protección de la vida privada y a
          la Ley N° 21.719 sobre protección y tratamiento de los datos personales, que entra en vigencia el 1 de diciembre
          de 2026. Los datos de contacto están al final de esta página.
        </P>
        <P>
          Versión de esta política: {LEGAL_VERSION}, publicada el {LEGAL_UPDATED}. No hemos designado un delegado o
          encargado de prevención; las solicitudes sobre tus datos las atiende directamente el equipo de TCG Cardeck.
        </P>
      </>
    ),
  },
  {
    id: "origen",
    title: "De dónde obtenemos tus datos",
    body: (
      <UL
        items={[
          "De ti, cuando te registras, completas tu perfil, publicas, compras, vendes o nos escribes.",
          "De Google, solo si eliges ingresar con tu cuenta de Google (nombre, email verificado e identificador).",
          "De la otra parte de una orden: si compras, el vendedor puede agregar el código de seguimiento del envío; los mensajes y reseñas los escriben ambas partes.",
          "De tu navegador, de forma automática: dirección IP y cookies descritas más abajo.",
        ]}
      />
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
            ["Decisiones de privacidad", "Aceptación o rechazo, fecha, versión, texto informado, origen e identificador aleatorio; cuenta asociada si has iniciado sesión.", "Al registrarte o elegir tus preferencias de cookies. Historial por 24 meses, con eliminación en la limpieza semanal; acceso exclusivo del administrador y acceso a tus propios registros en la descarga de datos."],
            ["Cuenta", "Nombre, email, RUT, teléfono, dirección y contraseña (guardada cifrada; nosotros no podemos verla).", "Al registrarte y al editar tu perfil."],
            ["Vendedores", "Cuenta bancaria (banco, tipo, número, titular y RUT), comuna y región, foto o logo y descripción.", "Cuando pides ser vendedor y completas tu perfil."],
            ["Compras y ventas", "Productos, montos, dirección y método de envío, notas de la orden, comprobantes de transferencia, mensajes del chat y reseñas.", "Cuando compras, vendes o conversas en una orden."],
            ["Tiendas y soporte", "Solicitudes de membresía y su comprobante, datos de personalización de la tienda y tickets de soporte.", "Cuando contratas un plan o nos escribes."],
            ["Técnicos", "Dirección IP (solo para límites anti-abuso), cookie de sesión y preferencias.", "Cada vez que usas el sitio."],
            ["Ingreso con Google", "Nombre, email verificado e identificador de tu cuenta de Google. Nunca recibimos tu contraseña de Google.", "Solo si eliges ingresar con Google."],
            ["Verificación en dos pasos", "Una clave secreta (guardada cifrada) y códigos de respaldo (guardados con hash).", "Solo si activas esta protección."],
            ["Estadísticas de tienda", "Conteo diario de visitas y escaneos de QR, sin identificar a las personas.", "Cuando alguien visita una tienda premium."],
            ["Analítica propia opcional", "Sección visitada e identificador de sesión transformado y distinto cada día; sin vincularlo con tu cuenta, nombre, correo o búsqueda.", "Solo si aceptas estadísticas; consulta y descarga exclusivas del administrador."],
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
        <P>Cada uso tiene una base legal (Ley N° 19.628, arts. 12 y 13, según la Ley N° 21.719):</P>
        <Table
          head={["Para qué", "Base legal"]}
          rows={[
            ["Crear y administrar tu cuenta y verificar tu identidad.", "Ejecución del contrato que aceptas al registrarte (Términos y condiciones)."],
            ["Gestionar tus compras y ventas: reservar stock, generar la orden, mostrar los datos necesarios a la otra parte y mantener el historial.", "Ejecución del contrato."],
            ["Enviarte avisos del servicio, como la recuperación de contraseña o novedades de tu orden o de tus tickets.", "Ejecución del contrato."],
            ["Darte soporte, resolver reclamos y responder tus solicitudes sobre tus datos.", "Ejecución del contrato y cumplimiento de obligaciones legales (Ley del Consumidor y Ley N° 19.628)."],
            ["Conservar órdenes y comprobantes por el plazo que exigen las normas contables y tributarias.", "Cumplimiento de una obligación legal."],
            ["Proteger la plataforma: límites de intentos, prevención de fraudes y abusos, y registro de acciones sensibles.", "Interés legítimo: mantener seguras las cuentas y las compras de todos. Puedes oponerte, y evaluaremos tu caso."],
            ["Perfil público de vendedor y reseñas.", "Ejecución del contrato: quien vende acepta mostrar su perfil para que le compren."],
            ["Estadísticas propias opcionales de navegación y búsqueda.", "Tu consentimiento, que puedes retirar cuando quieras desde el botón “Privacidad”, sin que eso afecte lo ya tratado ni tu uso del sitio."],
            ["Responder ante tribunales u organismos públicos.", "Formulación, ejercicio o defensa de un derecho."],
          ]}
        />
        <P>
          <B>No tomamos decisiones automatizadas ni elaboramos perfiles</B> que produzcan efectos jurídicos en ti o te
          afecten significativamente. Los únicos bloqueos automáticos son límites temporales de intentos (por ejemplo,
          demasiadas claves erróneas); si crees que uno te afectó por error, escríbenos y una persona lo revisará.
        </P>
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
            <><B>Proveedores tecnológicos</B> que operan el servicio por encargo nuestro, solo según nuestras instrucciones y sin poder usar tus datos para otros fines: alojamiento del sitio (Vercel), base de datos (Supabase) y envío de correos (Resend, cuando está configurado).</>,
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
          <B>No usamos cookies de publicidad ni herramientas de analítica de terceros.</B> La analítica propia es opcional y puedes cambiar tu elección con el botón “Privacidad”. Consulta nuestra <Link href="/politica-de-cookies" className="underline">política de cookies y estadísticas</Link>. Puedes borrar o bloquear las
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
            "Las contraseñas se guardan mediante hash bcrypt, no como texto recuperable.",
            "La comunicación viaja cifrada (HTTPS) y la sesión usa una cookie protegida.",
            "Los comprobantes de transferencia son privados: solo pueden verlos las partes de la orden y la administración.",
            "Aplicamos límites de intentos, validación de archivos y permisos por rol en cada acción.",
            "Puedes activar la verificación en dos pasos y cerrar tus sesiones en otros dispositivos desde tu cuenta.",
            "Dejamos un registro de las acciones sensibles del equipo administrador y de los cambios de seguridad de las cuentas.",
          ]}
        />
        <P>
          Ningún sistema es infalible. Si ocurre una vulneración de seguridad que ponga en riesgo tus derechos, la
          reportaremos sin demora a la Agencia de Protección de Datos Personales, la registraremos con sus efectos y las
          medidas adoptadas y, cuando afecte datos sensibles o datos de obligaciones económicas o comerciales (como datos
          bancarios), te avisaremos directamente en lenguaje claro, con qué datos se vieron afectados y qué hacer.
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
        necesarios, los eliminamos o los anonimizamos. Los eventos de analítica propia se eliminan al superar 90 días en la siguiente ejecución semanal; los informes agregados se conservan 52 semanas. Cuando el respaldo semanal está habilitado, las copias cifradas de la base se conservan hasta 90 días, tienen acceso restringido y se usan para recuperación. Una eliminación puede tardar hasta ese plazo en desaparecer de copias históricas. Al restaurar un respaldo deben reaplicarse las solicitudes de eliminación posteriores a su fecha. Las solicitudes sobre tus datos y nuestras respuestas se conservan para poder acreditar que las atendimos.
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
          Si tratamos tus datos en base a tu consentimiento, puedes retirarlo cuando quieras y por un medio igual de
          simple; el retiro no afecta lo tratado antes.
        </P>
        <P>
          <B>Cómo ejercerlos:</B> usa el{" "}
          <Link href={RIGHTS_FORM} className="font-semibold text-brand-600 hover:text-brand-700">
            formulario de solicitudes sobre datos personales
          </Link>
          {CONTACT_EMAIL ? <> o escribe a <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-600 hover:text-brand-700">{CONTACT_EMAIL}</a></> : null}
          , desde el email de tu cuenta para que podamos verificar que eres tú. Indica qué derecho ejerces y sobre qué
          datos; si pides rectificar, qué hay que corregir, y si pides suprimir u oponerte, el motivo. Es gratis (el acceso
          y la portabilidad, al menos una vez por trimestre).
        </P>
        <UL
          items={[
            <>Te confirmaremos la recepción y responderemos por escrito <B>dentro de 30 días corridos</B>, prorrogables una sola vez por otros 30 si el caso lo requiere.</>,
            <>Si junto con una rectificación, supresión u oposición pides el <B>bloqueo temporal</B> de tus datos, te responderemos sobre el bloqueo <B>dentro de 2 días hábiles</B> y no los trataremos mientras tanto.</>,
            <>Si rechazamos tu solicitud, total o parcialmente, te explicaremos el motivo. Algunos datos debemos conservarlos por obligación legal, por un contrato en curso o para defender un reclamo.</>,
          ]}
        />
        <P>
          Si rechazamos tu solicitud o no respondemos a tiempo, puedes reclamar ante la{" "}
          <B>Agencia de Protección de Datos Personales</B> dentro de 30 días hábiles.
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
      <>
        <P>Para operar el sitio, tus datos se almacenan o procesan fuera de Chile:</P>
        <Table
          head={["Proveedor", "Para qué", "País"]}
          rows={[
            ["Vercel", "Alojamiento del sitio y ejecución del servidor", "Estados Unidos (Portland, Oregón)"],
            ["Supabase", "Base de datos y archivos subidos", "Estados Unidos (Oregón)"],
            ["Resend", "Envío de correos del servicio, cuando está configurado", "Estados Unidos"],
            ["Google", "Ingreso con Google, solo si lo eliges", "Estados Unidos"],
          ]}
        />
        <P>
          A la fecha, la Agencia de Protección de Datos Personales no ha publicado un listado de países con nivel adecuado
          de protección, por lo que no podemos afirmar que Estados Unidos lo tenga. Estas transferencias son necesarias
          para prestarte el servicio que contratas y se amparan en los acuerdos de tratamiento de datos de cada proveedor,
          que incluyen cláusulas contractuales tipo y obligaciones de seguridad y confidencialidad. Puedes pedirnos más
          información sobre estas garantías por los canales de contacto.
        </P>
      </>
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
