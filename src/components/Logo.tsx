import Image from "next/image";

const MARK_RATIO = 590 / 240;
const FULL_RATIO = 738 / 600;

/**
 * "full" (default): el logo completo con "WIN CONDITION TCG" — se usa en
 * todos lados, el "mark" (solo el ícono) queda disponible por si algún
 * espacio muy chico lo necesita más adelante.
 */
export function Logo({
  variant = "full",
  height,
}: {
  variant?: "mark" | "full";
  height?: number;
}) {
  const h = height ?? (variant === "full" ? 120 : 44);
  const ratio = variant === "full" ? FULL_RATIO : MARK_RATIO;
  const src = variant === "full" ? "/logo-full.png" : "/logo-mark.png";
  const alt = "Win Condition TCG";

  return (
    <Image
      src={src}
      alt={alt}
      width={Math.round(h * ratio)}
      height={h}
      style={{ height: h, width: "auto" }}
      priority
    />
  );
}
