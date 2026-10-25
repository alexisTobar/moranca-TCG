"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { MapPin, ArrowUpRight, Truck, Store, Search } from "lucide-react";
import { REGIONS } from "@/lib/regions";
import { GAME_LIST } from "@/lib/games";
import shapes from "@/data/chile-regions.json";

export interface DirectorySeller {
  id:string; name:string; slug:string; city:string|null; region:string|null; image:string|null;
  store:boolean; shipping:boolean; pickup:boolean; games:{game:string;stock:number;listings:number}[];
}
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

export function StoreDirectory({sellers,unavailable=false,initialRegion=""}:{sellers:DirectorySeller[];unavailable?:boolean;initialRegion?:string}) {
  const [region,setRegion]=useState(REGIONS.some(r=>r.name===initialRegion)?initialRegion:"");
  const [city,setCity]=useState("");
  const [game,setGame]=useState("");
  const [query,setQuery]=useState("");
  const [onlyStores,setOnlyStores]=useState(false);
  const [metric,setMetric]=useState<"sellers"|"stock">("sellers");
  const [limit,setLimit]=useState(18);
  const chooseRegion=(name:string)=>{setRegion(name);setCity("");setLimit(18);};
  const base=useMemo(()=>sellers.filter(s=>(!onlyStores||s.store)&&(!game||s.games.some(g=>g.game===game))&&(!query||normalize(`${s.name} ${s.city||""} ${s.region||""}`).includes(normalize(query)))),[sellers,onlyStores,game,query]);
  const stock=(s:DirectorySeller)=>s.games.filter(g=>!game||g.game===game).reduce((sum,g)=>sum+g.stock,0);
  const matches=base.filter(s=>(!region||s.region===region)&&(!city||normalize(s.city||"")===normalize(city)));
  const counts=REGIONS.map(r=>({code:r.code,name:r.name,sellers:base.filter(s=>s.region===r.name).length,stock:base.filter(s=>s.region===r.name).reduce((sum,s)=>sum+stock(s),0)}));
  const max=Math.max(1,...counts.map(r=>r[metric]));
  const communes=REGIONS.find(r=>r.name===region)?.comunas||[];
  return <div className="store-explorer">
    <div className="explorer-toolbar">
      <label><span>Buscar tienda o comuna</span><div className="explorer-input"><Search size={18}/><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(18);}} placeholder="Nombre, comuna o región"/></div></label>
      <label><span>Juego</span><select value={game} onChange={e=>{setGame(e.target.value);setLimit(18);}}><option value="">Todos los TCG</option>{GAME_LIST.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label><span>Región</span><select value={region} onChange={e=>chooseRegion(e.target.value)}><option value="">Todo Chile</option>{REGIONS.map(r=><option key={r.code}>{r.name}</option>)}</select></label>
      <label><span>Comuna</span><select value={city} disabled={!region} onChange={e=>{setCity(e.target.value);setLimit(18);}}><option value="">Todas las comunas</option>{communes.map(c=><option key={c}>{c}</option>)}</select></label>
    </div>
    <div className="explorer-options"><label><input type="checkbox" checked={onlyStores} onChange={e=>{setOnlyStores(e.target.checked);setLimit(18);}}/> Solo tiendas con página propia</label><button type="button" onClick={()=>{chooseRegion("");setQuery("");setGame("");setOnlyStores(false);}}>Limpiar filtros</button></div>
    {unavailable ? <div role="status" className="explorer-empty"><h2>No pudimos cargar las tiendas</h2><p>El directorio no está disponible temporalmente. Intenta nuevamente en unos momentos.</p><a href="/explorar" className="btn btn-primary mt-4">Volver a intentar</a></div> : <div className="explorer-layout">
      <aside className="region-map-panel" aria-label="Explorar Chile por región">
        <div className="explorer-switch"><button type="button" aria-pressed={metric==="sellers"} onClick={()=>setMetric("sellers")}>Vendedores</button><button type="button" aria-pressed={metric==="stock"} onClick={()=>setMetric("stock")}>Unidades en stock</button></div>
        <div className="region-map-body"><svg viewBox="0 0 200 720" aria-label="Mapa interactivo de las regiones de Chile continental">
          {shapes.map(shape=>{const r=counts.find(r=>r.code===shape.code);if(!r)return null;return <path key={shape.code} d={shape.d} role="button" tabIndex={0} aria-label={`${r.name}: ${r[metric]} ${metric==="sellers"?"vendedores":"unidades"}`} aria-pressed={region===r.name} onClick={()=>chooseRegion(r.name)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();chooseRegion(r.name);}}} fill={region===r.name?"#b51f3b":r[metric]?`color-mix(in srgb, #b51f3b ${25+65*r[metric]/max}%, #fbe9ed)` : "#e6e8ec"}><title>{`${r.name}: ${r[metric]}`}</title></path>;})}
        </svg><div className="region-map-list">{counts.map(r=><button key={r.code} type="button" aria-pressed={region===r.name} onClick={()=>chooseRegion(r.name)}><span>{r.name}</span><strong>{r[metric].toLocaleString("es-CL")}</strong></button>)}</div></div>
        <p className="map-note">Selecciona una región en el mapa o en la lista. Gris: sin publicaciones disponibles.</p>
        <p className="map-credit">Límites: BCN / OCHA, vía <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a> · CC BY 3.0 IGO. Geometría simplificada; Chile continental.</p>
      </aside>
      <section className="explorer-results" aria-label="Resultados del directorio">
        <div className="explorer-result-heading"><div><h2>{city||region||"Tiendas y vendedores de Chile"}</h2><p aria-live="polite">{matches.length} {matches.length===1?"vendedor":"vendedores"} · {matches.reduce((n,s)=>n+stock(s),0).toLocaleString("es-CL")} unidades disponibles{game?` de ${GAME_LIST.find(g=>g.id===game)?.short}`:""}</p></div><MapPin aria-hidden="true"/></div>
        {!matches.length ? <div className="explorer-empty"><h3>No hay resultados para estos filtros</h3><p>Prueba otra región, comuna o juego. Solo mostramos vendedores habilitados con publicaciones disponibles o una tienda activa.</p></div> : <div className="directory-list">{matches.slice(Math.max(0,limit-18),limit).map(s=><article key={s.id} className="directory-store"><div className="directory-store-title"><span className="store-initial" aria-hidden="true">{s.image?<Image src={s.image} alt="" width={42} height={42} className="rounded-lg object-contain" unoptimized/>:s.name.slice(0,1)}</span><div><h3><Link href={s.store?`/tienda/${s.slug}`:`/vendedor/${s.slug}`}>{s.name}</Link></h3><p>{s.city||"Comuna no informada"}{s.region?` · ${s.region}`:""}</p></div><ArrowUpRight size={20} aria-hidden="true"/></div><div className="directory-tags"><span>{s.store?"Tienda con catálogo propio":"Perfil de vendedor"}</span>{s.shipping&&<span><Truck size={14}/> Envíos</span>}{s.pickup&&<span><Store size={14}/> Retiro coordinado</span>}</div><div className="directory-stock"><span>{s.games.filter(g=>!game||g.game===game).map(g=>GAME_LIST.find(x=>x.id===g.game)?.short||g.game).join(" · ")||"Sin stock publicado"}</span><strong>{stock(s).toLocaleString("es-CL")} unidades</strong></div><Link className="directory-visit" href={s.store?`/tienda/${s.slug}`:`/vendedor/${s.slug}`}>Ver {s.store?"tienda":"publicaciones"}<ArrowUpRight size={16}/></Link></article>)}</div>}
        {matches.length>18&&<nav className="mt-6 flex flex-wrap items-center gap-3" aria-label="Páginas del directorio"><button className="btn btn-secondary" disabled={limit<=18} onClick={()=>setLimit(n=>Math.max(18,n-18))}>Anteriores</button><span className="text-sm text-ink-400">{Math.min(matches.length,limit-17)}–{Math.min(limit,matches.length)} de {matches.length}</span><button className="btn btn-secondary" disabled={limit>=matches.length} onClick={()=>setLimit(n=>n+18)}>Siguientes</button></nav>}
      </section>
    </div>}
  </div>;
}
