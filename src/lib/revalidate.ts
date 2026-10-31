import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/** Tras un cambio del admin o de una tienda: las páginas públicas guardadas en caché (inicio, directorio, tiendas, descuentos) se actualizan ya. */
export function refreshPublic() {
  try {
    revalidatePath("/");
    revalidatePath("/tienda/[slug]", "page");
    revalidateTag("store-directory");
    revalidateTag("site-settings");
  } catch {
    /* nunca debe romper la acción principal */
  }
}
