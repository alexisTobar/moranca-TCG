"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Envuelve contenido server-rendered y le agrega "is-visible" cuando entra en
 * pantalla, para animarlo con las clases .reveal / .stagger de globals.css.
 * Sin JS (o antes de hidratar) el contenido queda visible igual: el estado
 * inicial oculto lo define la clase CSS, no un `hidden` real.
 */
export function Reveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className} ${visible ? "is-visible" : ""}`}>
      {children}
    </div>
  );
}
