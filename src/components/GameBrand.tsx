"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { GAMES, type GameId } from "@/lib/games";

/** A remote logo failure must leave a readable game name, never a broken image. */
export function GameBrand({game,decorative=false,style}:{game:GameId;decorative?:boolean;style?:CSSProperties}) {
  const [failed,setFailed]=useState(false);
  const image=useRef<HTMLImageElement>(null);
  const meta=GAMES[game];
  useEffect(()=>{
    const element=image.current;
    if(element?.complete && element.naturalWidth===0)setFailed(true);
  },[game]);
  if(failed)return <span className="game-brand-fallback" role={decorative?undefined:"img"} aria-label={decorative?undefined:meta.name} aria-hidden={decorative||undefined} style={style}>{meta.short}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} src={meta.logo} alt={decorative?"":meta.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)} style={style}/>;
}
