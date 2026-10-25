"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

/** The camera moves over the tabletop; the content and shopping controls stay still. */
export function CampaignMotion({children}:{children:ReactNode}) {
  const stage=useRef<HTMLDivElement>(null);
  const [paused,setPaused]=useState(false);
  const [reduced,setReduced]=useState(true);
  const [visible,setVisible]=useState(false);
  const [hidden,setHidden]=useState(false);
  useEffect(()=>{
    const preference=window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference=()=>setReduced(preference.matches);
    const updateVisibility=()=>setHidden(document.hidden);
    updatePreference();updateVisibility();
    preference.addEventListener("change",updatePreference);
    document.addEventListener("visibilitychange",updateVisibility);
    const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{threshold:.05});
    if(stage.current)observer.observe(stage.current);
    return()=>{observer.disconnect();preference.removeEventListener("change",updatePreference);document.removeEventListener("visibilitychange",updateVisibility);};
  },[]);
  const running=!paused&&!reduced&&visible&&!hidden;
  return <div ref={stage} className="cardeck-campaign-stage" data-motion={running?"running":"paused"}>
    {children}
    {!reduced&&<button type="button" className="campaign-motion-control" aria-label={paused?"Reanudar movimiento de portada":"Pausar movimiento de portada"} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={15} aria-hidden="true"/>:<Pause size={15} aria-hidden="true"/>}<span>{paused?"Reanudar":"Pausar"}</span></button>}
  </div>;
}
