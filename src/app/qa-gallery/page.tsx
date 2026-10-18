import { ListingCard, type ListingCardData } from "@/components/ListingCard";
import { CartProvider } from "@/components/cart/CartProvider";
export default function QaGallery() {
  const cards: ListingCardData[] = [
    { id:"qa-1",slug:"qa-1",title:"Pikachu ex",game:"pokemon",type:"SINGLE",price:12900,offerPrice:10900,imageUrl:"https://assets.tcgdex.net/en/me/me02.5/276/high.webp",condition:"NM",language:"EN",isFoil:true,stock:2,setName:"Ascended Heroes",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-2",slug:"qa-2",title:"Monkey D. Luffy — carta con un nombre largo para comprobar el ajuste de línea",game:"onepiece",type:"SINGLE",price:19900,offerPrice:null,imageUrl:"https://static.dotgg.gg/onepiece/card/OP05-119.webp",condition:"EX",language:"EN",isFoil:false,stock:0,setName:"Awakening of the New Era",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-3",slug:"qa-3",title:"Carta sin imagen",game:"magic",type:"SINGLE",price:1000,offerPrice:null,imageUrl:null,condition:null,language:null,isFoil:false,stock:10,setName:null,sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
    { id:"qa-4",slug:"qa-4",title:"Guerra Celestial",game:"myl",type:"SINGLE",price:5000,offerPrice:null,imageUrl:"/qa-missing-image.webp",condition:"NM",language:"ES",isFoil:false,stock:1,setName:"AyD Vigilantes",sellerId:"qa",seller:{name:"Vendedor de prueba",slug:"qa"}},
  ];
  return <CartProvider><main className="catalog-editorial min-h-screen p-6"><h1 className="font-display text-3xl mb-3">Prueba visual de galería</h1><p className="mb-8">Datos sintéticos locales: oferta, agotado, imagen ausente e imagen rota. No son publicaciones reales.</p><div className="catalog-results max-w-5xl">{cards.map(card=><ListingCard key={card.id} listing={card}/>)}</div></main></CartProvider>;
}
