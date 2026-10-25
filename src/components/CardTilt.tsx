"use client";

import { useRef, type ReactNode } from "react";

/** Inclina la carta hacia el puntero y mueve un brillo holográfico. Solo con mouse; sin efecto si se pide menos movimiento. */
export function CardTilt({children,className=""}:{children:ReactNode;className?:string}) {
  const ref=useRef<HTMLDivElement>(null);
  const frame=useRef(0);
  function enabled(event:React.PointerEvent){
    return event.pointerType==="mouse"&&!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function move(event:React.PointerEvent<HTMLDivElement>){
    if(!enabled(event))return;
    const element=ref.current;if(!element)return;
    const {clientX,clientY}=event;
    cancelAnimationFrame(frame.current);
    frame.current=requestAnimationFrame(()=>{
      const box=element.getBoundingClientRect();
      const x=(clientX-box.left)/box.width;
      const y=(clientY-box.top)/box.height;
      element.style.setProperty("--rx",`${((.5-y)*14).toFixed(2)}deg`);
      element.style.setProperty("--ry",`${((x-.5)*14).toFixed(2)}deg`);
      element.style.setProperty("--mx",`${(x*100).toFixed(1)}%`);
      element.style.setProperty("--my",`${(y*100).toFixed(1)}%`);
    });
  }
  function leave(){
    cancelAnimationFrame(frame.current);
    const element=ref.current;if(!element)return;
    for(const name of ["--rx","--ry"])element.style.removeProperty(name);
  }
  return <div ref={ref} className={`card-tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}</div>;
}
