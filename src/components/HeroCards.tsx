"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { CardArtwork } from "./CardArtwork";
import styles from "./HeroCards.module.css";

interface HeroCard { game: string; src: string; alt: string; name: string; detail: string }
const LABELS: Record<string, string> = { magic: "Magic", pokemon: "Pokémon", onepiece: "One Piece", myl: "Mitos y Leyendas" };

export function HeroCards({ cards }: { cards: HeroCard[] }) {
  const root = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const bounds = useRef<DOMRect | null>(null);
  const [entered, setEntered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    const visibility = () => setHidden(document.hidden);
    update(); visibility();
    preference.addEventListener("change", update);
    document.addEventListener("visibilitychange", visibility);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setEntered(true);
    }, { threshold: .1 });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); preference.removeEventListener("change", update); document.removeEventListener("visibilitychange", visibility); cancelAnimationFrame(raf.current); };
  }, []);
  const stopped = reduced || paused || !visible || hidden;
  useEffect(() => {
    if (!stopped) return;
    cancelAnimationFrame(raf.current);
    root.current?.querySelectorAll<HTMLElement>("a").forEach(el => { el.style.setProperty("--tilt-x", "0deg"); el.style.setProperty("--tilt-y", "0deg"); });
  }, [stopped]);
  return <div ref={root} className={styles.scene} data-entered={entered && !reduced} data-paused={stopped} aria-label="Cartas destacadas de los cuatro juegos">
    <div className={styles.grid} key={replay}>
      {cards.map((card, i) => <div key={card.game} className={styles.arrival} style={{ "--index": i, "--angle": `${[-6, -2, 3, 7][i % 4]}deg`, "--offset": i % 2 ? "18px" : "0px" } as CSSProperties}>
        <Link href={`/cartas?game=${card.game}`} aria-label={`Ver cartas de ${LABELS[card.game] || card.game}`} className={styles.link}
          onPointerEnter={event => { bounds.current = event.currentTarget.getBoundingClientRect(); }}
          onPointerMove={event => {
            if (stopped || event.pointerType !== "mouse" || !bounds.current) return;
            const element = event.currentTarget;
            const x = Math.max(0, Math.min(1, (event.clientX - bounds.current.left) / bounds.current.width));
            const y = Math.max(0, Math.min(1, (event.clientY - bounds.current.top) / bounds.current.height));
            cancelAnimationFrame(raf.current);
            raf.current = requestAnimationFrame(() => {
              element.style.setProperty("--tilt-x", `${(.5 - y) * 16}deg`);
              element.style.setProperty("--tilt-y", `${(x - .5) * 20}deg`);
              element.style.setProperty("--shine-x", `${x * 100}%`);
              element.style.setProperty("--shine-y", `${y * 100}%`);
            });
          }} onPointerLeave={event => { cancelAnimationFrame(raf.current); bounds.current = null; event.currentTarget.style.setProperty("--tilt-x", "0deg"); event.currentTarget.style.setProperty("--tilt-y", "0deg"); }}>
          <span className={styles.card}>
            <CardArtwork src={card.src} alt={card.alt} sizes="(max-width:639px) 40vw, (max-width:1023px) 21vw, 230px" className={styles.image} priority />
            <span className={styles.hologram} aria-hidden="true" />
            <span className={styles.shine} aria-hidden="true" />
          </span>
          <span className={styles.caption}><span>{LABELS[card.game]}</span><strong>{card.name}</strong><span>{card.detail}</span></span>
        </Link>
      </div>)}
    </div>
    <div className={styles.controls}>
      <p>Cuatro juegos. Tu siguiente jugada.</p>
      <div><button type="button" disabled={reduced} onClick={() => { setReplay(n => n + 1); setPaused(false); }} aria-label="Repetir entrada de las cartas"><RotateCcw size={15} /> Repetir</button>
        <button type="button" disabled={reduced} onClick={() => setPaused(!paused)} aria-label={paused ? "Reanudar animación de cartas" : "Pausar animación de cartas"} aria-pressed={paused}>{paused ? <Play size={15} /> : <Pause size={15} />} {reduced ? "Movimiento reducido" : paused ? "Reanudar" : "Pausar"}</button></div>
    </div>
  </div>;
}
