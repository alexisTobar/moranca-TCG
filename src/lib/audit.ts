import "server-only";
import { prisma } from "@/lib/db";

export interface Actor {
  id: string | null;
  name: string;
}

/**
 * Deja constancia de una acción sensible (quién, qué y sobre qué). Nunca rompe la acción principal:
 * si el registro falla, solo se anota en el log del servidor.
 */
export async function audit(
  actor: Actor,
  action: string,
  target?: { type?: string; id?: string; detail?: string }
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name.slice(0, 120),
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        detail: target?.detail?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] no se pudo registrar", action, error);
  }
}

/** Nombre legible de cada acción, para la pantalla de auditoría. */
export const AUDIT_LABELS: Record<string, string> = {
  "user.create": "Creó un usuario",
  "user.update": "Editó un usuario",
  "user.delete": "Eliminó un usuario",
  "store.grant": "Regaló o extendió un plan de tienda",
  "store.suspend": "Suspendió una tienda",
  "store.resume": "Reanudó una tienda",
  "store.revoke": "Cortó el plan de una tienda",
  "store.feature": "Cambió una tienda destacada",
  "plan.update": "Editó un plan de tienda",
  "subscription.approve": "Aprobó un pago de membresía",
  "subscription.reject": "Rechazó un pago de membresía",
  "settings.update": "Cambió la configuración de pagos",
  "discount.create": "Creó un descuento por método de pago",
  "discount.update": "Editó un descuento por método de pago",
  "discount.delete": "Eliminó un descuento por método de pago",
  "report.resolve": "Resolvió un reporte",
  "report.dismiss": "Descartó un reporte",
  "listing.admin_edit": "Editó la publicación de otro vendedor",
  "security.password_changed": "Cambió su contraseña",
  "security.password_reset": "Recuperó su contraseña",
  "security.sessions_closed": "Cerró sus sesiones en otros dispositivos",
  "security.2fa_enabled": "Activó la verificación en dos pasos",
  "security.2fa_disabled": "Desactivó la verificación en dos pasos",
  "security.account_deleted": "Eliminó su cuenta",
  "security.data_exported": "Descargó sus datos",
};
