"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CardArtwork } from "./CardArtwork";
import type { ListingCardData } from "./ListingCard";
import { publicListingType } from "@/lib/listing-kind";
import { clp } from "@/lib/format";
import { gameName } from "@/lib/games";
import { cardHref } from "@/lib/card-url";

const CATEGORIES = [
  {value:"all",label:"Para descubrir"}, {value:"SINGLE",label:"Cartas"},
  {value:"DECK",label:"Mazos"}, {value:"SEALED",label:"Sellados"}, {value:"ACCESSORY",label:"Accesorios"},
];

export function HomeShowcase({items,unavailable=false}:{items:ListingCardData[];unavailable?:boolean}) {
  const [category,setCategory]=useState("all");
  const [previous,setPrevious]=useState(false);
  const [next,setNext]=useState(false);
  const track=useRef<HTMLUListElement>(null);
  const products=[...new Map(items.filter(item=>item.stock>0).map(item=>[item.id,{...item,type:publicListingType(item.type,item.title)}])).values()];
  const groups=CATEGORIES.slice(1).map(c=>products.filter(item=>item.type===c.value));
  const mixed=Array.from({length:Math.max(0,...groups.map(group=>group.length))},(_,index)=>groups.flatMap(group=>group[index]?[group[index]]:[])).flat();
  const visible=category==="all"?mixed:products.filter(item=>item.type===category);
  const searchType=category==="all"?"SINGLE":category;
  const searchLabel=CATEGORIES.find(option=>option.value===searchType)!.label.toLowerCase();

  useEffect(()=>{
    const element=track.current;
    if(!element)return;
    element.scrollLeft=0;
    const update=()=>{setPrevious(element.scrollLeft>2);setNext(element.scrollLeft+element.clientWidth<element.scrollWidth-2);};
    const observer=new ResizeObserver(update);
    observer.observe(element);element.addEventListener("scroll",update,{passive:true});update();
    return()=>{observer.disconnect();element.removeEventListener("scroll",update);};
  },[category,items]);

  function move(direction:number){
    const element=track.current;if(!element)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({left:direction*element.clientWidth*.85,behavior:reduced?"instant":"smooth"});
  }

  return <section className="home-market max-w-7xl" aria-labelledby="home-market-title">
    <header className="home-market-intro">
      <h1 id="home-market-title">Encuentra lo que vas a jugar.</h1>
      <p>Cartas, mazos, sellados y accesorios de vendedores de Chile.</p>
      <form action="/cartas" role="search" className="home-market-search">
        <input type="hidden" name="type" value={searchType}/>
        <label htmlFor="home-product-query" className="sr-only">Buscar {searchLabel}</label>
        <input id="home-product-query" name="q" type="search" placeholder={`Buscar ${searchLabel}…`} maxLength={120} autoComplete="off"/>
        <button type="submit">Buscar</button>
      </form>
    </header>
    <div className="home-market-toolbar">
      <div className="home-market-categories" aria-label="Productos de la vitrina">
        {CATEGORIES.map(option=><button key={option.value} type="button" aria-pressed={category===option.value} onClick={()=>setCategory(option.value)}>{option.label}</button>)}
      </div>
      <div className="home-market-arrows">
        <button type="button" onClick={()=>move(-1)} disabled={!previous||!visible.length} aria-label="Ver productos anteriores"><ChevronLeft size={19} aria-hidden="true"/></button>
        <button type="button" onClick={()=>move(1)} disabled={!next||!visible.length} aria-label="Ver más productos"><ChevronRight size={19} aria-hidden="true"/></button>
      </div>
    </div>
    {visible.length ? <ul ref={track} className="home-market-track" aria-label="Productos disponibles" tabIndex={0}>
      {visible.map((item,index)=>{
        const href=item.market?cardHref(item.game,item.market.identity):item.type === "SINGLE" && item.externalId?cardHref(item.game,item.externalId):`/producto/${item.slug}`;
        const offer=item.offerPrice!=null&&item.offerPrice<item.price;
        return <li key={item.id} className="home-market-product">
          <Link href={href} className="home-market-image" aria-label={`Ver ${item.title}`}><CardArtwork src={item.imageUrl} alt={item.title} sizes="(max-width:639px) 62vw, (max-width:1023px) 32vw, 240px" className="object-contain" priority={index<3}/></Link>
          <div className="home-market-product-copy">
            <p>{item.type==="ACCESSORY"?"Accesorios":gameName(item.game)}</p>
            <h2><Link href={href}>{item.title}</Link></h2>
            <div className="home-market-price">{offer&&<del>{clp(item.price)}</del>}<strong>{clp(offer?item.offerPrice!:item.price)}</strong></div>
            <span>{item.seller.name}</span>
          </div>
        </li>;
      })}
    </ul>:<div className="home-market-empty" role="status"><h2>{unavailable?"No pudimos cargar la vitrina":"Todavía no hay productos en esta selección"}</h2><p>{unavailable?"Vuelve a intentarlo en unos momentos. También puedes explorar el catálogo.":"Explora las otras categorías o publica tu primer producto."}</p></div>}
    <div className="home-market-footer">
      <Link href={category==="all"||category==="SINGLE"?"/cartas":`/cartas?type=${category}`}>Ver {category==="all"?"el catálogo":CATEGORIES.find(c=>c.value===category)?.label.toLowerCase()}</Link>
      <Link href="/explorar">Encuentra una tienda cerca de ti</Link>
    </div>
  </section>;
}
