/** Temas del formulario público de contacto (compartido entre servidor y cliente). */
export const CONTACT_TOPICS = [
  { value: "CUENTA", label: "No puedo ingresar o problemas con mi cuenta" },
  { value: "COMPRA", label: "Una duda antes de comprar" },
  { value: "VENDER", label: "Quiero vender o abrir mi tienda" },
  { value: "OTRO", label: "Otro tema" },
] as const;

export function contactTopicLabel(value: string): string {
  return CONTACT_TOPICS.find((t) => t.value === value)?.label ?? "Otro tema";
}
