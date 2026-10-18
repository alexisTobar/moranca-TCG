import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { P, Table } from "@/components/legal/blocks";

export const metadata: Metadata = { title: "Cookies y estadísticas", alternates: { canonical: "/politica-de-cookies" } };
export default function CookiesPage() {
  return <LegalLayout current="/politica-de-cookies" eyebrow="Tu privacidad" title="Cookies y estadísticas" intro="Puedes comprar y navegar sin aceptar estadísticas opcionales." sections={[
    { id: "esenciales", title: "Almacenamiento necesario", body: <><P>La sesión, el carrito y las preferencias que solicitas permiten prestar el servicio. No usamos cookies publicitarias. El detalle de las cookies de acceso está en la política de privacidad.</P><Table head={["Nombre", "Finalidad", "Duración"]} rows={[
      ["wc_analytics", "Recuerda si aceptaste o rechazaste la analítica propia.", "180 días; luego volvemos a preguntar."],
      ["wc_consent_version", "Identifica la versión de la política revisada. Una actualización requiere una nueva elección.", "180 días."],
      ["wc_consent_subject", "Identificador aleatorio del navegador para respaldar sus decisiones, inaccesible a JavaScript.", "180 días."],
      ["wc_checkout_request (sessionStorage)", "Evita duplicar tu compra si reintentas tras una interrupción. Contiene temporalmente la solicitud, incluida la dirección de despacho.", "Hasta completar la compra o cerrar la pestaña."],
    ]} /></> },
    { id: "opcionales", title: "Estadísticas opcionales", body: <><P>Solo al elegir “Aceptar estadísticas” enviamos la sección visitada y un identificador aleatorio de la pestaña. No enviamos la búsqueda, la dirección completa de la página, nombres ni correos. El servidor transforma el identificador con una clave y la fecha: no permite seguir la misma sesión entre días. No se almacena la IP en la tabla de analítica.</P><Table head={["Nombre", "Finalidad", "Duración"]} rows={[["wc_usage_session (sessionStorage)", "Agrupa visitas consentidas de una pestaña. No se vincula a tu cuenta.", "Hasta cerrar la pestaña o retirar el consentimiento."]]} /><P>Los eventos se conservan hasta 90 días y se eliminan en la siguiente ejecución semanal. Los informes agregados se conservan 52 semanas. Solo el administrador puede consultar o descargar estos datos. Las cifras de registros, órdenes y pagos se obtienen de la operación del servicio, independientemente de la aceptación de estadísticas de navegación.</P></> },
    { id: "registro", title: "Respaldo de tus decisiones", body: <P>Guardamos cada aceptación, rechazo o cambio con fecha del servidor, versión, texto informado, origen e identificador aleatorio. Si tienes una sesión iniciada al decidir, se vincula a tu cuenta. No guardamos tu IP ni tu navegador en este registro. Solo la administración puede consultarlo y exportarlo. Conservamos estos eventos durante 24 meses y los eliminamos en la siguiente limpieza semanal; los respaldos descargados deben seguir el mismo plazo. La aceptación de términos se registra separadamente de las estadísticas opcionales.</P> },
    { id: "control", title: "Cambiar tu elección", body: <P>Usa el botón “Privacidad” de la esquina inferior para aceptar o retirar tu consentimiento en cualquier momento. Rechazar no impide comprar. Respetamos las señales Do Not Track y Global Privacy Control para no enviar visitas opcionales. Retirar el consentimiento detiene futuros envíos; los informes ya agregados no permiten identificarte. Más información en nuestra <Link href="/politica-de-privacidad" className="underline">política de privacidad</Link>.</P> },
  ]} />;
}
