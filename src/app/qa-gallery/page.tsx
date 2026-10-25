import { StoreDirectory } from "@/components/store/StoreDirectory";
import { PriceChart } from "@/components/card/PriceChart";
import { CardSellers, type SellerOfferRow } from "@/components/card/CardSellers";
import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CartProvider } from "@/components/cart/CartProvider";
import { notFound } from "next/navigation";
import Link from "next/link";
import { HeroHand } from "@/components/HeroHand";

export const metadata = { robots: { index: false, follow: false } };

/** Galería interna de QA: no existe en producción. */
export default function QaGallery() {
  if (process.env.NODE_ENV === "production") notFound();
  const cards: ListingCardData[] = [
    { id:"qa-1",slug:"qa-1",title:"Pikachu ex",game:"pokemon",type:"SINGLE",price:12900,offerPrice:10900,imageUrl:"https://assets.tcgdex.net/en/me/me02.5/276/high.webp",condition:"NM",language:"EN",isFoil:true,stock:2,setName:"Ascended Heroes",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-2",slug:"qa-2",title:"Monkey D. Luffy — carta con un nombre largo para comprobar el ajuste de línea",game:"onepiece",type:"SINGLE",price:19900,offerPrice:null,imageUrl:"https://static.dotgg.gg/onepiece/card/OP05-119.webp",condition:"EX",language:"EN",isFoil:false,stock:0,setName:"Awakening of the New Era",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-3",slug:"qa-3",title:"Carta sin imagen",game:"magic",type:"SINGLE",price:1000,offerPrice:null,imageUrl:null,condition:null,language:null,isFoil:false,stock:10,setName:null,sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-4",slug:"qa-4",title:"Guerra Celestial",game:"myl",type:"SINGLE",price:5000,offerPrice:null,imageUrl:"/qa-missing-image.webp",condition:"NM",language:"ES",isFoil:false,stock:1,setName:"AyD Vigilantes",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
  ];
  const offers:SellerOfferRow[] = [0,1].map(i=>({id:'qa-offer-'+i,slug:'qa-offer-'+i,price:1000+i*200,listPrice:1400,stock:2+i,condition:i?'EX':'NM',language:i?'ES':'EN',isFoil:!!i,seller:{id:'qa-seller-'+i,name:'Vendedor de prueba '+(i+1),slug:'qa',avatarUrl:null,city:'Santiago',region:'Metropolitana de Santiago',offersShipping:true,offersPickup:true,rating:0,reviews:0,sales:0,salesLabel:null,near:false}}));
  const history = {'*':[60,30,0].map((days,i)=>({day:new Date(Date.now()-days*86400000).toISOString().slice(0,10),min:1000+i*200,market:1500+i*100,max:2000,listings:2}))};
  cards[0].market={identity:'qa',sellers:2,stock:5};
  return <CartProvider><main className="catalog-editorial min-h-screen p-6"><div className="hero-table mb-8"><div className="hero-table-copy"><h1>Tu próxima jugada empieza aquí.</h1><p>Cartas, sellados y mazos de vendedores de todo Chile. Compara precios, elige a quién comprarle y paga directo al vendedor.</p><div><Link href="/cartas" className="btn btn-gold btn-lg">Explorar cartas</Link><Link href="/explorar" className="campaign-stores-link">Ver tiendas por región</Link></div></div><HeroHand cards={[...cards,cards[0],cards[1]].slice(0,5).map((c,i)=>({...c,id:c.id+i}))}/></div><h1 className="font-display text-3xl mb-3">Prueba visual de galería</h1><p className="mb-8">Datos sintéticos locales: oferta, agotado, imagen ausente e imagen rota. No son publicaciones reales.</p><div className="catalog-results max-w-5xl">{cards.map(card=><ListingCard key={card.id} listing={card}/>)}</div><section className="mt-12"><h2 className="text-2xl mb-6">Directorio — datos sintéticos de prueba</h2><StoreDirectory sellers={[{id:"qa-s1",name:"Tienda de prueba Santiago",slug:"qa",city:"Santiago",region:"Metropolitana de Santiago",image:null,store:true,shipping:true,pickup:true,games:[{game:"pokemon",stock:23,listings:4}]},{id:"qa-s2",name:"Coleccionista de prueba Valparaíso",slug:"qa",city:"Valparaíso",region:"Valparaíso",image:null,store:false,shipping:true,pickup:true,games:[{game:"magic",stock:12,listings:2}]}]}/></section><div className="card-market-page mt-12 grid gap-10 lg:grid-cols-2"><CardSellers offers={offers} buyerRegion={null} imageUrl={cards[0].imageUrl} title="Carta de prueba" game="pokemon"/><section className="card-surface p-5"><h2 className="text-xl font-bold mb-4">Historial de prueba — datos sintéticos</h2><PriceChart history={history} languageLabels={{"*":"Todos"}} /></section></div></main></CartProvider>;
}
