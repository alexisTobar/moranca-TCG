"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import styles from "./HeroCards.module.css";

interface HeroCard { game: string; src: string; alt: string; name: string; detail: string }
const COLORS = ["#73d8ff", "#e5f77d", "#f4a7e4", "#f6c570"];

/** Anima las mismas cuatro cartas de portada, conservando imágenes y enlaces. */
export function HeroCards({ cards }: { cards: HeroCard[] }) {
  const root = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update(); preference.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setEntered(true);
    }, { threshold: .15 });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); preference.removeEventListener("change", update); cancelAnimationFrame(raf.current); };
  }, []);
  const stopped = reduced || paused || !visible;
  return <div ref={root} className={styles.scene} data-entered={entered} data-paused={stopped} aria-label="Cartas destacadas de los cuatro juegos">
    <div className={styles.aura} aria-hidden="true" />
    <div className={styles.constellation} aria-hidden="true"><span /><span /><span /></div>
    <div className={styles.grid} key={replay}>
      {cards.map((card, i) => <div key={card.game} className={styles.arrival} style={{ "--index": i, "--glow": COLORS[i % COLORS.length], "--offset": i % 2 ? "30px" : "0px" } as CSSProperties}>
        <Link href={`/cartas?game=${card.game}`} aria-label={`Ver cartas de ${card.game === "myl" ? "Mitos y Leyendas" : card.game === "onepiece" ? "One Piece" : card.game === "pokemon" ? "Pokémon" : "Magic"}`} className={styles.link}
          onPointerMove={(event) => {
            if (stopped || event.pointerType !== "mouse") return;
            const element = event.currentTarget;
            const box = element.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width;
            const y = (event.clientY - box.top) / box.height;
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() => {
              element.style.setProperty("--tilt-x", `${(0.5 - y) * 20}deg`);
              element.style.setProperty("--tilt-y", `${(x - .5) * 26}deg`);
              element.style.setProperty("--shine-x", `${x * 100}%`);
              element.style.setProperty("--shine-y", `${y * 100}%`);
            });
          }} onPointerLeave={(event) => { cancelAnimationFrame(raf.current); event.currentTarget.style.setProperty("--tilt-x", "0deg"); event.currentTarget.style.setProperty("--tilt-y", "0deg"); }}>
          <span className={styles.float}>
            <span className={styles.card}>
              <Image src={card.src} alt={card.alt} fill sizes="(max-width:640px) 145px, (max-width:1024px) 20vw, 175px" className={styles.image} priority unoptimized />
              <span className={styles.hologram} aria-hidden="true" />
              <span className={styles.shine} aria-hidden="true" />
              <span className={styles.edge} aria-hidden="true" />
            </span>
            <span className={styles.caption}><strong>{card.name}</strong><span>{card.detail}</span></span>
          </span>
        </Link>
      </div>)}
    </div>
    <div className={styles.controls}>
      <span>CUATRO UNIVERSOS. TU SIGUIENTE JUGADA.</span>
      <div>
        <button type="button" onClick={() => { setReplay((n) => n + 1); setPaused(false); }} aria-label="Repetir entrada de las cartas" title="Repetir animación"><RotateCcw size={13} /></button>
        <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar animación de cartas" : "Pausar animación de cartas"} aria-pressed={paused}>{paused ? <Play size={13} /> : <Pause size={13} />} {paused ? "Reanudar" : "Pausar"}</button>
      </div>
    </div>
  </div>;
}
