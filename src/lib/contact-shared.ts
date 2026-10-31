/** Temas del formulario público de contacto (compartido entre servidor y cliente). */
export const CONTACT_TOPICS = [
  { value: "CUENTA", label: "No puedo ingresar o problemas con mi cuenta" },
  { value: "COMPRA", label: "Una duda antes de comprar" },
  { value: "VENDER", label: "Quiero vender o abrir mi tienda" },
  { value: "DATOS", label: "Mis datos personales: acceso, rectificación, supresión, oposición, portabilidad o bloqueo" },
  { value: "OTRO", label: "Otro tema" },
] as const;

/** Plazo legal para responder una solicitud de derechos (Ley 21.719, art. 11): 30 días corridos, prorrogables una vez. */
export const PRIVACY_REQUEST_DAYS = 30;

export function contactTopicLabel(value: string): string {
  return CONTACT_TOPICS.find((t) => t.value === value)?.label ?? "Otro tema";
}
