"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export interface Flight {
  id: string;
  imageUrl: string | null;
  from: DOMRect;
  to: DOMRect;
}

/**
 * Capa fija que dibuja la miniatura "volando" desde la carta hasta el ícono
 * del carrito. Reemplaza abrir el carrito en cada click: es solo feedback
 * visual de que el producto se agregó.
 */
export function FlyToCartLayer({ flights }: { flights: Flight[] }) {
  if (flights.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100]" aria-hidden="true">
      {flights.map((f) => (
        <FlyingItem key={f.id} flight={f} />
      ))}
    </div>
  );
}

function FlyingItem({ flight }: { flight: Flight }) {
  const SIZE = 44;
  const [landed, setLanded] = useState(false);

  const startX = flight.from.left + flight.from.width / 2 - SIZE / 2;
  const startY = flight.from.top + flight.from.height / 2 - SIZE / 2;
  const endX = flight.to.left + flight.to.width / 2 - SIZE / 2;
  const endY = flight.to.top + flight.to.height / 2 - SIZE / 2;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setLanded(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="absolute overflow-hidden rounded-lg border border-ink-700 bg-white shadow-lg transition-all duration-[550ms] ease-in"
      style={{
        width: SIZE,
        height: SIZE,
        left: landed ? endX : startX,
        top: landed ? endY : startY,
        opacity: landed ? 0 : 1,
        transform: landed ? "scale(0.35) rotate(12deg)" : "scale(1) rotate(0deg)",
      }}
    >
      {flight.imageUrl && (
        <Image src={flight.imageUrl} alt="" fill className="object-cover" unoptimized />
      )}
    </div>
  );
}
