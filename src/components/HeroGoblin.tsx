"use client";

import Link from "next/link";
import { GoblinArt } from "./GoblinArt";
import { useEffect, useRef, useState } from "react";

const LINES = ["¿Qué carta buscas hoy?", "¡Compara precios y ahorra!", "Tengo ofertas de todo Chile…", "¿Armamos un mazo?"];

/**
 * El duende del logo asoma desde el borde del inicio: sube al cargar, flota, mira hacia donde mueves el mouse
 * y, al pasar el cursor o tocarlo, saluda con un globo de texto que lleva al catálogo. Respeta "reducir movimiento".
 */
export function HeroGoblin() {
  const root = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = root.current;
    const host = el?.parentElement;
    if (!el || !host) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 420));
        const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 320));
        el.style.setProperty("--gx", `${dx * 10}px`);
        el.style.setProperty("--gy", `${dy * 6}px`);
        el.style.setProperty("--gr", `${dx * 7}deg`);
      });
    };
    host.addEventListener("pointermove", onMove);
    return () => { host.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);

  function greet() {
    setLine((n) => (shown ? (n + 1) % LINES.length : n));
    setShown(true);
    window.setTimeout(() => setShown(false), 4200);
  }

  return (
    <div ref={root} className="hero-goblin" data-talking={shown} onPointerEnter={greet}>
      <Link href="/cartas" className="hero-goblin-bubble" tabIndex={shown ? 0 : -1} aria-hidden={!shown}>{LINES[line]}</Link>
      <button type="button" className="hero-goblin-body" onClick={greet} aria-label="El duende de TCG Cardeck te saluda">
        <GoblinArt aria-hidden="true" focusable="false" />
      </button>
    </div>
  );
}
